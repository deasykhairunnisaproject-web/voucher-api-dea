export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  const { customerNo, customerName, product } = req.body || {};

  const productMap = {
    'MAP': { prefix: 'MAP', name: 'MAP', nominal: 'Rp 100.000', stock: 50 },
    'Kopi Kenangan': { prefix: 'KOPI', name: 'Kopi Kenangan', nominal: 'Rp 50.000', stock: 50 },
    'Blibli': { prefix: 'BLI', name: 'Blibli', nominal: 'Rp 100.000', stock: 50 },
    'Grab': { prefix: 'GRAB', name: 'Grab', nominal: 'Rp 50.000', stock: 0 }
  };

  // Produk tidak ditemukan
  if (!product || !productMap[product]) {
    return res.status(400).json({
      success: false,
      errorType: 'INVALID_PRODUCT',
      message: 'Produk voucher tidak valid.'
    });
  }

  const info = productMap[product];

  // Stok habis
  if (info.stock <= 0) {
    return res.status(400).json({
      success: false,
      errorType: 'OUT_OF_STOCK',
      message: 'Maaf, voucher ' + info.name + ' sudah habis.'
    });
  }

  // Simulasi random system error (5% chance)
  if (Math.random() < 0.05) {
    return res.status(500).json({
      success: false,
      errorType: 'SYSTEM_ERROR',
      message: 'Sistem sedang gangguan. Silakan coba beberapa saat lagi.'
    });
  }

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let random = '';
  for (let i = 0; i < 8; i++) random += chars.charAt(Math.floor(Math.random() * chars.length));
  const voucherCode = info.prefix + '-' + random.slice(0, 4) + '-' + random.slice(4);

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30);

  return res.status(200).json({
    success: true,
    voucherCode: voucherCode,
    productName: info.name,
    nominal: info.nominal,
    expiryDate: expiry.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  });
}
