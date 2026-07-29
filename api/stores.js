export default function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  const { area } = req.body || {};

  if (!area || area.trim() === '') {
    return res.status(200).json({
      success: "false",
      message: "Mohon ketik nama kota atau kecamatan kamu ya 😊"
    });
  }

  // =============================================
  // DATABASE TOKO (dummy - ganti nanti ke Google Sheets)
  // Tambah/hapus toko di sini sesuai kebutuhan
  // =============================================
  const stores = [
    // DEPOK
    {
      name: "Alfamart Margonda",
      area: "Depok",
      address: "Jl. Margonda Raya No. 100, Depok",
      promo: "Bimoli 2L Rp28.900 (hemat 25%)",
      maps: "https://maps.google.com/?q=-6.3702,106.8312"
    },
    {
      name: "Alfamart Sawangan",
      area: "Depok",
      address: "Jl. Raya Sawangan No. 45, Depok",
      promo: "Indomie Goreng 5pcs Rp13.500 (hemat 20%)",
      maps: "https://maps.google.com/?q=-6.4105,106.7658"
    },
    {
      name: "Alfamart Kalimulya",
      area: "Depok",
      address: "Jl. Kelurahan Pondok Rajeg No. 12, Depok",
      promo: "Beras Sania 5kg Rp64.900 (hemat 11%)",
      maps: "https://maps.google.com/?q=-6.3845,106.8567"
    },

    // JAKARTA BARAT
    {
      name: "Alfamart Kebon Jeruk",
      area: "Jakarta Barat",
      address: "Jl. Kebon Jeruk Raya No. 1, Jakarta Barat",
      promo: "Pepsodent 190g Rp9.900 (hemat 21%)",
      maps: "https://maps.google.com/?q=-6.1886,106.7625"
    },
    {
      name: "Alfamart Grogol",
      area: "Jakarta Barat",
      address: "Jl. Daan Mogot KM.1 No. 88, Grogol, Jakarta Barat",
      promo: "Minyak Bimoli 1L Rp15.900 (hemat 18%)",
      maps: "https://maps.google.com/?q=-6.1670,106.7860"
    },

    // JAKARTA SELATAN
    {
      name: "Alfamart Kemang",
      area: "Jakarta Selatan",
      address: "Jl. Kemang Raya No. 55, Jakarta Selatan",
      promo: "Susu Ultra 1L Rp16.500 (hemat 15%)",
      maps: "https://maps.google.com/?q=-6.2615,106.8133"
    },
    {
      name: "Alfamart Fatmawati",
      area: "Jakarta Selatan",
      address: "Jl. RS Fatmawati No. 22, Jakarta Selatan",
      promo: "Chitato 68g Rp8.900 (hemat 20%)",
      maps: "https://maps.google.com/?q=-6.2927,106.7972"
    },

    // TANGERANG
    {
      name: "Alfamart BSD",
      area: "Tangerang",
      address: "Jl. BSD Raya Utama No. 10, Tangerang Selatan",
      promo: "Aqua 1500ml (6pcs) Rp18.900 (hemat 15%)",
      maps: "https://maps.google.com/?q=-6.3015,106.6535"
    },
    {
      name: "Alfamart Cipondoh",
      area: "Tangerang",
      address: "Jl. Cipondoh Raya No. 77, Tangerang",
      promo: "Good Day 250ml (3pcs) Rp10.500 (hemat 22%)",
      maps: "https://maps.google.com/?q=-6.1932,106.6295"
    },

    // BOGOR
    {
      name: "Alfamart Pajajaran",
      area: "Bogor",
      address: "Jl. Pajajaran No. 30, Bogor",
      promo: "Kapal Api 165g Rp12.900 (hemat 18%)",
      maps: "https://maps.google.com/?q=-6.5950,106.7900"
    }
  ];

  // =============================================
  // CARI TOKO BERDASARKAN AREA
  // Pakai case-insensitive partial match
  // User ketik "depok" atau "Depok" atau "DEPOK" → sama aja
  // User ketik "kebon jeruk" → match "Jakarta Barat" dan juga nama toko
  // =============================================
  const keyword = area.trim().toLowerCase();

  const results = stores.filter(store => {
    return (
      store.area.toLowerCase().includes(keyword) ||
      store.name.toLowerCase().includes(keyword) ||
      store.address.toLowerCase().includes(keyword)
    );
  });

  if (results.length === 0) {
    return res.status(200).json({
      success: "false",
      message: "Maaf, belum ada toko promo di area \"" + area + "\" saat ini. Coba ketik kota lain ya! 😊\n\nArea yang tersedia: Depok, Jakarta Barat, Jakarta Selatan, Tangerang, Bogor"
    });
  }

  // Format daftar toko untuk ditampilkan di WhatsApp
  let storeList = "";
  results.forEach((store, i) => {
    storeList += (i + 1) + ". *" + store.name + "*\n";
    storeList += "📍 " + store.address + "\n";
    storeList += "🏷️ " + store.promo + "\n";
    storeList += "🗺️ " + store.maps + "\n";
    if (i < results.length - 1) storeList += "\n";
  });

  return res.status(200).json({
    success: "true",
    count: results.length.toString(),
    area: area,
    storeList: storeList,
    message: "Berikut " + results.length + " toko promo di area " + area + ":\n\n" + storeList
  });
}
