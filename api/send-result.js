// api/send-result.js — Send eligible/not eligible template via WABA API
// Called by dashboard when admin clicks Eligible or Not Eligible button

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const {
    customerNo,
    customerName,
    status // 'eligible' or 'not_eligible'
  } = req.body || {};

  if (!customerNo || !status) {
    return res.status(400).json({
      success: false,
      message: 'customerNo and status are required'
    });
  }

  // ============================================================
  // WABA API Configuration
  // Replace these with your actual values:
  // ============================================================
  const PHONE_NUMBER_ID = '456235350898330';   // From Meta Business Manager
  const ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN';           // From Meta Business Manager
  const TEMPLATE_ELIGIBLE = 'prudential_eligible';     // Template name (approved by Meta)
  const TEMPLATE_NOT_ELIGIBLE = 'prudential_not_eligible'; // Template name

  // Format phone number (remove leading 0, add 62 for Indonesia)
  let phone = customerNo.replace(/\D/g, '');
  if (phone.startsWith('0')) phone = '62' + phone.slice(1);
  if (!phone.startsWith('62')) phone = '62' + phone;

  const templateName = status === 'eligible' ? TEMPLATE_ELIGIBLE : TEMPLATE_NOT_ELIGIBLE;

  // Build WABA API request body
  const wabaBody = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: customerName || 'Customer' }
          ]
        }
      ]
    }
  };

  // ============================================================
  // For DUMMY TESTING (no real WABA call):
  // Comment out the fetch below and use the dummy response instead
  // ============================================================

  // --- DUMMY MODE (for testing without WABA) ---
  const dummyMode = true; // Set to false when you have real WABA credentials

  if (dummyMode) {
    // Update status in store
    const store = globalThis.__surveyStore || [];
    const entry = store.find(s => s.customerNo === customerNo);
    if (entry) entry.status = status;

    return res.status(200).json({
      success: true,
      message: `[DUMMY] Template "${templateName}" would be sent to ${phone}`,
      status: status,
      customerNo: customerNo,
      customerName: customerName,
      templateUsed: templateName,
      note: 'Dummy mode — no actual WhatsApp message sent. Set dummyMode=false and fill in WABA credentials for real sending.'
    });
  }

  // --- REAL MODE (uncomment when ready) ---
  try {
    const wabaResponse = await fetch(
      `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(wabaBody)
      }
    );

    const wabaData = await wabaResponse.json();

    // Update status in store
    const store = globalThis.__surveyStore || [];
    const entry = store.find(s => s.customerNo === customerNo);
    if (entry) entry.status = status;

    if (wabaResponse.ok) {
      return res.status(200).json({
        success: true,
        message: `Template "${templateName}" sent to ${phone}`,
        wabaResponse: wabaData
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Failed to send template',
        wabaError: wabaData
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error calling WABA API',
      error: error.message
    });
  }
}
