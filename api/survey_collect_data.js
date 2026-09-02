// api/survey.js — Check eligibility + log to Google Sheets
// Deploy to: voucher-api-dea GitHub repo → Vercel auto-deploy

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
    age,
    health,
    exercise,
    monthlySpend
  } = req.body || {};

  if (!customerNo) {
    return res.status(400).json({ success: false, message: 'customerNo is required' });
  }

  // ============================================================
  // WHITELIST RULES — Eligible combinations
  // ============================================================
  const eligibleAges = ['18 - 25', '26 - 35', '36 - 45'];
  const eligibleHealth = ['Excellent', 'Good'];
  const eligibleExercise = ['2 - 3 time', '4 - 5 time', 'More than 5 times'];
  const eligibleSpending = ['Rp. 3 - 7 Mio', 'Rp. 7 - 15 Mio', 'Above Rp. 5 Mio'];

  let score = 0;
  if (eligibleAges.includes(age)) score++;
  if (eligibleHealth.includes(health)) score++;
  if (eligibleExercise.includes(exercise)) score++;
  if (eligibleSpending.includes(monthlySpend)) score++;

  const isEligible = score >= 3;

  // Generate voucher if eligible
  let voucherCode = '';
  let expiryDate = '';
  let coverage = '';
  let term = '';
  let plan = '';

  if (isEligible) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let random = '';
    for (let i = 0; i < 8; i++) random += chars.charAt(Math.floor(Math.random() * chars.length));
    voucherCode = 'PRU-' + random.slice(0, 4) + '-' + random.slice(4);

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 365);
    expiryDate = expiry.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    coverage = 'Rp 100.000.000';
    term = '1 Year';
    plan = 'PRU Life Essential';
  }

  // ============================================================
  // LOG KE GOOGLE SHEETS (async, non-blocking)
  // Ganti URL dengan Google Apps Script deployment URL kamu
  // ============================================================
  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzoPSJGzZGis8-iKrx40RTjnWzyJYGIaFpUnc5Zr_kUu_Oi5ybXJ_KU1WlzggdmG59i/exec";

  try {
    if (APPS_SCRIPT_URL && !APPS_SCRIPT_URL.includes("GANTI_DENGAN")) {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerNo: customerNo || '',
          customerName: customerName || '',
          age: age || '',
          health: health || '',
          exercise: exercise || '',
          monthlySpend: monthlySpend || '',
          eligible: isEligible ? 'Yes' : 'No',
          voucherCode: voucherCode || '-',
          score: score + '/4',
          timestamp: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
        })
      }).catch(() => {});
    }
  } catch (e) {}

  // ============================================================
  // RETURN RESPONSE KE NEUAPIX
  // ============================================================
  return res.status(200).json({
    success: true,
    eligible: isEligible ? 'true' : 'false',
    customerNo: customerNo,
    customerName: customerName || 'Customer',
    score: score + '/4',
    voucherCode: voucherCode,
    expiryDate: expiryDate,
    coverage: coverage,
    term: term,
    plan: plan,
    message: isEligible
      ? 'Congratulations! You are eligible for FREE Life Insurance!'
      : 'Thank you for your interest. Unfortunately you are not eligible at this time.'
  });
}
