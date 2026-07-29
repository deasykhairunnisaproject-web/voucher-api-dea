// In-memory store (untuk testing)
const claimed = new Map();

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { customerNo, customerName, product } = req.body || {};

  const productMap = {
    'MAP': { prefix: 'MAP', name: 'MAP', nominal: 'Rp 100.000', stock: 50 },
    'Kopi Kenangan': { prefix: 'KOPI', name: 'Kopi Kenangan', nominal: 'Rp 50.000', stock: 50 },
    'Blibli': { prefix: 'BLI', name: 'Blibli', nominal: 'Rp 100.000', stock: 50 },
    'Grab': { prefix: 'GRAB', name: 'Grab', nominal: 'Rp 50.000', stock: 0 }
  };

  if (!product || !productMap[product]) {
    return res.status(200).json({ success: "false", message: 'Produk voucher tidak valid.' });
  }

  // Cek apakah customer sudah pernah claim
  if (claimed.has(customerNo)) {
    const prev = claimed.get(customerNo);
    return res.status(200).json({
      success: "false",
      message: 'Kamu sudah pernah claim voucher ' + prev.productName + ' dengan kode ' + prev.voucherCode + '. Setiap customer hanya bisa claim 1 voucher.'
    });
  }

  const info = productMap[product];

  if (info.stock <= 0) {
    return res.status(200).json({ success: "false", message: 'Mohon maaf, voucher ' + info.name + ' sudah habis. Silakan pilih voucher lain.' });
  }

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let random = '';
  for (let i = 0; i < 8; i++) random += chars.charAt(Math.floor(Math.random() * chars.length));
  const voucherCode = info.prefix + '-' + random.slice(0, 4) + '-' + random.slice(4);

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30);

  // Simpan record claim
  claimed.set(customerNo, { voucherCode, productName: info.name });

  return res.status(200).json({
    success: "true",
    voucherCode: voucherCode,
    productName: info.name,
    nominal: info.nominal,
    message: '',
    expiryDate: expiry.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  });
}
