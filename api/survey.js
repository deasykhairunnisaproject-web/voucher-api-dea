// api/survey.js — Check eligibility based on whitelist rules
// Deploy to: deaproject GitHub repo → Vercel auto-deploy
// Neuapix HTTP Request URL: https://deaproject.vercel.app/api/survey

export default function handler(req, res) {
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
  // Adjust these rules as needed
  // ============================================================

  const eligibleAges = ['18 - 25', '26 - 35', '36 - 45'];
  const eligibleHealth = ['Excellent', 'Good'];
  const eligibleExercise = ['2 - 3 time', '4 - 5 time', 'More than 5 times'];
  const eligibleSpending = ['Rp. 3 - 7 Mio', 'Rp. 7 - 15 Mio', 'Above Rp. 5 Mio'];

  let score = 0;
  let maxScore = 4;

  if (eligibleAges.includes(age)) score++;
  if (eligibleHealth.includes(health)) score++;
  if (eligibleExercise.includes(exercise)) score++;
  if (eligibleSpending.includes(monthlySpend)) score++;

  // Eligible if score >= 3 out of 4
  const isEligible = score >= 3;

  // Generate voucher code if eligible (reuse logic from voucher.js)
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

  return res.status(200).json({
    success: true,
    eligible: isEligible ? 'yes' : 'no',
    customerNo: customerNo,
    customerName: customerName || 'Customer',
    score: score + '/' + maxScore,
    // Only filled if eligible
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
