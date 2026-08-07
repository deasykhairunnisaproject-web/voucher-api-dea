// api/survey.js — Receive survey data from Neuapix HTTP Request
// Deploy to: deaproject GitHub repo → Vercel auto-deploy
// Neuapix HTTP Request URL: https://deaproject.vercel.app/api/survey

// In-memory store (resets on cold start — for production use a real database)
// Vercel serverless functions share memory within the same instance
const globalStore = globalThis.__surveyStore || (globalThis.__surveyStore = []);

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — Dashboard fetches all survey data
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      data: globalStore,
      total: globalStore.length
    });
  }

  // POST — Neuapix HTTP Request sends survey data here
  if (req.method === 'POST') {
    const {
      customerNo,
      customerName,
      age,
      health,
      exercise,
      monthlySpend
    } = req.body || {};

    if (!customerNo) {
      return res.status(400).json({
        success: false,
        message: 'customerNo is required'
      });
    }

    const surveyEntry = {
      id: Date.now().toString(),
      customerNo: customerNo,
      customerName: customerName || 'Unknown',
      age: age || '-',
      health: health || '-',
      exercise: exercise || '-',
      monthlySpend: monthlySpend || '-',
      submittedAt: new Date().toISOString(),
      status: 'pending' // pending | eligible | not_eligible
    };

    globalStore.push(surveyEntry);

    return res.status(200).json({
      success: true,
      message: 'Survey data received',
      surveyId: surveyEntry.id
    });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
