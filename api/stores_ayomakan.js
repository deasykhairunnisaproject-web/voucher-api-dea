export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: "false", message: 'Method not allowed' });

  const { latitude, longitude, customerNo, customerName } = req.body || {};

  // LOGGING (non-blocking)
  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzer3cDrbE3a4va3MJ-gDX_48YFx7m__tYl7RjSNdIkU6r0rZoJfSscKL3z-GR1rJiY/exec";
  try {
    if (APPS_SCRIPT_URL && !APPS_SCRIPT_URL.includes("GANTI_")) {
      fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerNo: customerNo || '',
          customerName: customerName || '',
          latitude: latitude || '',
          longitude: longitude || '',
          action: 'Cek Promo AyoMakan',
          timestamp: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
        })
      }).catch(() => {});
    }
  } catch (e) {}

  if (!latitude || !longitude) {
    return res.status(200).json({
      success: "false",
      message: "Mohon kirimkan lokasi kamu terlebih dahulu ya"
    });
  }

  const userLat = parseFloat(latitude);
  const userLng = parseFloat(longitude);

  if (isNaN(userLat) || isNaN(userLng)) {
    return res.status(200).json({
      success: "false",
      message: "Format lokasi tidak valid. Silakan coba kirim ulang lokasi kamu"
    });
  }

  // GANTI DENGAN SHEET URL KAMU (format: /export?format=csv)
  const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQPN0G04ZUa-CdOfZzs69LrwDSdHj23VF1n7a35IaIjzbjHBnZKKCihNGoJviC5rw/pub?gid=368281439&single=true&output=csv";

  const RADIUS_KM = 15;
  const MAX_RESULTS = 5;

  try {
    const response = await fetch(SHEET_URL);
    const csvText = await response.text();

    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

    const stores = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

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

    function haversine(lat1, lng1, lat2, lng2) {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    const storesWithDistance = stores
      .map(store => {
        const storeLat = parseFloat(store.lat);
        const storeLng = parseFloat(store.lng);
        if (isNaN(storeLat) || isNaN(storeLng)) return null;
        const distance = haversine(userLat, userLng, storeLat, storeLng);
        return { ...store, distance };
      })
      .filter(s => s !== null && s.distance <= RADIUS_KM)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, MAX_RESULTS);

    if (storesWithDistance.length === 0) {
      return res.status(200).json({
        success: "false",
        message: "Maaf, belum ada promo AyoMakan dalam radius " + RADIUS_KM + " km dari lokasi kamu\n\nCoba kirim lokasi lain ya!"
      });
    }

    let storeList = "";
    storesWithDistance.forEach((store, i) => {
      const km = store.distance.toFixed(1);
      storeList += (i + 1) + ". *" + store.name + "* (" + km + " km)\n";
      storeList += "📍 " + store.address + "\n";
      storeList += "🏷️ *" + store.promo + "*\n";
      if (store.maps) storeList += "🗺️ " + store.maps + "\n";
      if (i < storesWithDistance.length - 1) storeList += "\n";
    });

    return res.status(200).json({
      success: "true",
      count: storesWithDistance.length.toString(),
      storeList: storeList,
      message: "*Top " + storesWithDistance.length + " Promo AyoMakan terdekat dari lokasi kamu:*\n\n" + storeList + "\n_Promo mengikuti kuota & ketentuan merchant_"
    });

  } catch (error) {
    return res.status(200).json({
      success: "false",
      message: "Maaf, terjadi gangguan. Silakan coba lagi nanti"
    });
  }
}
