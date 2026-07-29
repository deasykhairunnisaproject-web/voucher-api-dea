export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: "false", message: 'Method not allowed' });

  const { area } = req.body || {};

  if (!area || area.trim() === '') {
    return res.status(200).json({
      success: "false",
      message: "Mohon ketik nama kota atau kecamatan kamu ya 😊"
    });
  }

  // =============================================
  // GANTI URL INI dengan link Google Sheets kamu
  // File → Share → Publish to web → CSV
  // =============================================
  const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/GANTI_DENGAN_ID_KAMU/pub?output=csv";

  try {
    // Ambil data dari Google Sheets
    const response = await fetch(SHEET_URL);
    const csvText = await response.text();

    // Parse CSV jadi array of objects
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

    const stores = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      // Parse CSV line (handle koma di dalam quotes)
      const values = [];
      let current = '';
      let inQuotes = false;
      for (let c = 0; c < lines[i].length; c++) {
        const char = lines[i][c];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const store = {};
      headers.forEach((header, index) => {
        store[header] = values[index] || '';
      });
      stores.push(store);
    }

    // Filter berdasarkan area (case-insensitive, partial match)
    const keyword = area.trim().toLowerCase();
    const results = stores.filter(store => {
      return (
        (store.name || '').toLowerCase().includes(keyword) ||
        (store.area || '').toLowerCase().includes(keyword) ||
        (store.address || '').toLowerCase().includes(keyword)
      );
    });

    if (results.length === 0) {
      // Kumpulkan daftar area yang tersedia
      const availableAreas = [...new Set(stores.map(s => s.area).filter(Boolean))];
      return res.status(200).json({
        success: "false",
        message: "Maaf, belum ada toko promo di area \"" + area + "\" saat ini 😊\n\nArea yang tersedia:\n" + availableAreas.join(", ")
      });
    }

    // Format daftar toko untuk WhatsApp
    let storeList = "";
    results.forEach((store, i) => {
      storeList += (i + 1) + ". *" + store.name + "*\n";
      storeList += "📍 " + store.address + "\n";
      storeList += "🏷️ " + store.promo + "\n";
      if (store.maps) storeList += "🗺️ " + store.maps + "\n";
      if (i < results.length - 1) storeList += "\n";
    });

    return res.status(200).json({
      success: "true",
      count: results.length.toString(),
      area: area,
      storeList: storeList,
      message: "Berikut " + results.length + " toko promo di area *" + area + "*:\n\n" + storeList
    });

  } catch (error) {
    return res.status(200).json({
      success: "false",
      message: "Maaf, terjadi gangguan saat mengambil data toko. Silakan coba lagi nanti 🙏"
    });
  }
}
