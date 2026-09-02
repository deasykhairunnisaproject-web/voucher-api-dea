export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: "false", message: 'Method not allowed' });

  const { customerNo, customerName, action, detail } = req.body || {};

  // =============================================
  // GANTI URL INI dengan Google Apps Script URL kamu
  // (lihat panduan setup di bawah)
  // =============================================
  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/GANTI_DENGAN_ID_KAMU/exec";

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerNo: customerNo || '',
        customerName: customerName || '',
        action: action || '',
        detail: detail || '',
        timestamp: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
      })
    });

    return res.status(200).json({
      success: "true",
      message: "Log berhasil dicatat"
    });

  } catch (error) {
    return res.status(200).json({
      success: "true",
      message: "Log gagal tapi flow tetap lanjut"
    });
  }
}
