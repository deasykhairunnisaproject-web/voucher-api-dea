export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  const { customerNo, customerName, product } = req.body || {};
  const prefixMap = { 'MAP 100k': 'MAP', 'Kopi Kenangan 50k': 'KOPI', 'Blibli: 100k': 'BLI', 'Grab: 50k': 'GRAB' };
  const prefix = prefixMap[product] || 'VCHR';
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let random = '';
  for (let i = 0; i < 8; i++) random += chars.charAt(Math.floor(Math.random() * chars.length));
  const voucherCode = prefix + '-' + random.slice(0, 4) + '-' + random.slice(4);

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30);

  return res.status(200).json({
    success: true,
    voucherCode: voucherCode,
    expiryDate: expiry.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  });
}
