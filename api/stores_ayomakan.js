// api/stores.js — AyoMakan Promo Merchant API + Logging
// Data merchant dari Google Sheets (Publish to Web → CSV)
// Log user ke Google Sheets via Google Apps Script
// Deploy ke Vercel via GitHub

// =====================================================
// GANTI 2 URL INI:
// 1. SHEET_URL = Google Sheets Publish to Web CSV (data merchant)
// 2. LOG_URL   = Google Apps Script Web App URL (logging)
// =====================================================
const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/GANTI_DENGAN_ID_KAMU/pub?gid=0&single=true&output=csv";

const LOG_URL =
  "https://script.google.com/macros/s/GANTI_DENGAN_DEPLOYMENT_ID/exec";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ success: "false", errormsg: "Method not allowed" });
  }

  const { lat, lng, area, customerNo, customerName } = req.body || {};

  // Fetch data merchant dari Google Sheets
  let merchants = [];
  try {
    const response = await fetch(SHEET_URL);
    const csvText = await response.text();
    merchants = parseCSV(csvText);
  } catch (err) {
    return res.status(200).json({
      success: "false",
      errormsg: "Gagal mengambil data merchant. Coba lagi nanti ya!",
    });
  }

  if (merchants.length === 0) {
    return res.status(200).json({
      success: "false",
      errormsg: "Data merchant kosong. Pastikan Google Sheets sudah di-publish.",
    });
  }

  // =====================================================
  // MODE 1: By area
  // =====================================================
  if (area) {
    const areaLower = area.toLowerCase();
    const filtered = merchants
      .filter(
        (m) =>
          m.area.toLowerCase().includes(areaLower) ||
          m.subArea.toLowerCase().includes(areaLower)
      )
      .map(enrichMerchant);

    if (filtered.length === 0) {
      // Log: tidak ditemukan
      logToSheet(LOG_URL, { customerNo, customerName, area, lat: "-", lng: "-", result: "Tidak ada promo", stores: "-" });
      return res.status(200).json({
        success: "false",
        errormsg: `Belum ada promo merchant di area ${area}. Coba area lain ya!`,
      });
    }

    const top5 = filtered.slice(0, 5);

    // Log: sukses by area
    logToSheet(LOG_URL, {
      customerNo,
      customerName,
      area,
      lat: "-",
      lng: "-",
      result: "Sukses",
      stores: top5.map((s) => s.name).join(", "),
    });

    return res.status(200).json({
      success: "true",
      total: top5.length,
      area: area,
      message: formatMessage(top5, area),
      ...flatFields(top5),
    });
  }

  // =====================================================
  // MODE 2: By lat/lng
  // =====================================================
  if (!lat || !lng) {
    return res.status(200).json({
      success: "false",
      errormsg: "Lokasi belum diterima. Silakan kirim lokasi kamu ya!",
    });
  }

  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);

  if (isNaN(userLat) || isNaN(userLng)) {
    return res.status(200).json({
      success: "false",
      errormsg: "Format lokasi tidak valid. Coba kirim ulang lokasi kamu ya!",
    });
  }

  const radius = 15;
  const nearby = merchants
    .filter((m) => m.deliveryReady)
    .map((m) => ({
      ...enrichMerchant(m),
      distance: haversine(userLat, userLng, m.lat, m.lng),
    }))
    .sort((a, b) => a.distance - b.distance)
    .filter((m) => m.distance <= radius)
    .slice(0, 5);

  if (nearby.length === 0) {
    // Log: tidak ditemukan
    logToSheet(LOG_URL, { customerNo, customerName, area: "-", lat, lng, result: "Tidak ada promo di sekitar", stores: "-" });
    return res.status(200).json({
      success: "false",
      errormsg: "Maaf, belum ada promo merchant AyoMakan di sekitar lokasi kamu. Coba cek area lain ya!",
    });
  }

  // Log: sukses by location
  logToSheet(LOG_URL, {
    customerNo,
    customerName,
    area: nearby[0]?.area || "-",
    lat,
    lng,
    result: "Sukses",
    stores: nearby.map((s) => `${s.name} (${s.distance.toFixed(1)}km)`).join(", "),
  });

  return res.status(200).json({
    success: "true",
    total: nearby.length,
    message: formatMessageWithDistance(nearby),
    ...flatFieldsWithDistance(nearby),
  });
}

// =====================================================
// LOG ke Google Sheets via Apps Script (fire & forget)
// =====================================================
async function logToSheet(url, data) {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timestamp: new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
        customerNo: data.customerNo || "-",
        customerName: data.customerName || "-",
        area: data.area || "-",
        lat: data.lat || "-",
        lng: data.lng || "-",
        result: data.result || "-",
        stores: data.stores || "-",
      }),
    });
  } catch (e) {
    // Logging gagal bukan masalah — jangan block response
  }
}

// =====================================================
// Parse CSV dari Google Sheets
// =====================================================
function parseCSV(csv) {
  const lines = csv.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const merchants = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < headers.length) continue;

    const obj = {};
    headers.forEach((h, idx) => {
      obj[h.trim()] = values[idx]?.trim() || "";
    });

    if (!obj.name) continue;

    merchants.push({
      name: obj.name,
      slug: obj.slug,
      lat: parseFloat(obj.lat) || 0,
      lng: parseFloat(obj.lng) || 0,
      area: obj.area,
      subArea: obj.subArea,
      promo: obj.promo,
      discount: obj.discount,
      category: obj.category,
      deliveryReady: (obj.deliveryReady || "").toUpperCase() === "TRUE",
    });
  }

  return merchants;
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// =====================================================
// Helpers
// =====================================================
function enrichMerchant(m) {
  return {
    ...m,
    branchLink: `https://ayomakan.co.id/branch/${m.slug}`,
    mapsLink: `https://www.google.com/maps?saddr=My+Location&daddr=${m.lat},${m.lng}`,
  };
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

function flatFields(stores) {
  const out = {};
  stores.forEach((s, i) => {
    const n = i + 1;
    out[`store${n}`] = `${s.name} - ${s.promo}`;
    out[`link${n}`] = s.branchLink;
    out[`maps${n}`] = s.mapsLink;
  });
  return out;
}

function flatFieldsWithDistance(stores) {
  const out = {};
  stores.forEach((s, i) => {
    const n = i + 1;
    out[`store${n}`] = `${s.name} - ${s.promo} (${s.distance.toFixed(1)} km)`;
    out[`link${n}`] = s.branchLink;
    out[`maps${n}`] = s.mapsLink;
  });
  return out;
}

function formatMessage(stores, area) {
  let msg = `*Top ${stores.length} Promo AyoMakan di ${area}:*\n\n`;
  stores.forEach((s, i) => {
    msg += `*${i + 1}. ${s.name}*\n`;
    msg += `${s.promo}\n`;
    msg += `${s.subArea}\n`;
    msg += `${s.category}\n`;
    msg += `Pesan: ${s.branchLink}\n`;
    msg += `Lokasi: ${s.mapsLink}\n\n`;
  });
  msg += `_Promo mengikuti kuota & ketentuan merchant_`;
  return msg;
}

function formatMessageWithDistance(stores) {
  let msg = `*Top ${stores.length} Promo Restoran Terdekat:*\n\n`;
  stores.forEach((s, i) => {
    msg += `*${i + 1}. ${s.name}*\n`;
    msg += `${s.promo}\n`;
    msg += `${s.distance.toFixed(1)} km - ${s.subArea}\n`;
    msg += `${s.category}\n`;
    msg += `Pesan: ${s.branchLink}\n`;
    msg += `Lokasi: ${s.mapsLink}\n\n`;
  });
  msg += `_Promo mengikuti kuota & ketentuan merchant_`;
  return msg;
}
