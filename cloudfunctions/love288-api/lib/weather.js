/* ═══════════════════════════════════════════════════════════════════
   天气与距离（home.overview 用，api.md §B 规则 3/5）：
   - 天气：weather_cache 30 分钟新鲜度；过期且配置了 QWEATHER_KEY 时调和风天气
     免费 API（geo 城市查询 + now 实时 + 3d 高低温）并回写缓存；
     拉取失败回退旧缓存（过期也先用），无缓存则 null（前端隐藏天气卡）。
   - 距离：优先查本地城市坐标表（config.CITIES）；表外城市若有 QWEATHER_KEY
     则经和风 geo 查坐标；直线距离（球面 haversine），算不出返回 null。
   ═══════════════════════════════════════════════════════════════════ */
const https = require('https');
const config = require('./config');
const time = require('./time');

const CACHE_TTL = 30 * 60e3; /* 30 分钟 */

function httpGetJson(url, timeoutMs) {
  return new Promise(function (resolve) {
    const req = https.get(url, { timeout: timeoutMs || 8000 }, function (res) {
      let buf = '';
      res.on('data', function (chunk) { buf += chunk; });
      res.on('end', function () {
        try { resolve(JSON.parse(buf)); } catch (e) { resolve(null); }
      });
    });
    req.on('timeout', function () { req.destroy(); resolve(null); });
    req.on('error', function () { resolve(null); });
  });
}

function qkey() {
  return process.env.QWEATHER_KEY || '';
}

/* 城市名 → 和风 LocationID（天气接口需要 LocationID 或经纬度） */
async function qweatherLoc(city) {
  const key = qkey();
  if (!key) return null;
  const url = 'https://geoapi.qweather.com/v2/city/lookup?location='
    + encodeURIComponent(city) + '&key=' + key;
  const r = await httpGetJson(url);
  if (!r || r.code !== '200' || !r.location || !r.location.length) return null;
  return r.location[0];
}

/* 拉取当前天气 + 今日高低温；失败返回 null */
async function fetchWeather(city) {
  const loc = await qweatherLoc(city);
  if (!loc) return null;
  const key = qkey();
  const [nowR, dayR] = await Promise.all([
    httpGetJson('https://devapi.qweather.com/v2/weather/now?location=' + loc.id + '&key=' + key),
    httpGetJson('https://devapi.qweather.com/v2/weather/3d?location=' + loc.id + '&key=' + key)
  ]);
  if (!nowR || nowR.code !== '200' || !nowR.now) return null;
  const day = (dayR && dayR.code === '200' && dayR.daily && dayR.daily[0]) || null;
  return {
    temp: Number(nowR.now.temp),
    cond: nowR.now.text,
    high: day ? Number(day.tempMax) : Number(nowR.now.temp),
    low: day ? Number(day.tempMin) : Number(nowR.now.temp)
  };
}

function fmt(city, doc) {
  return {
    city: doc.city,
    temp: doc.temp,
    cond: doc.cond,
    high: doc.high,
    low: doc.low,
    updatedAt: doc.updatedAt
  };
}

async function weatherFor(db, city) {
  if (!city) return null;
  let cached = null;
  try {
    const got = await db.collection('weather_cache').doc(city).get();
    cached = got.data;
  } catch (e) { /* 无缓存 */ }

  if (cached && time.now() - cached.updatedAt < CACHE_TTL) {
    return fmt(city, cached); /* 缓存新鲜，直接用 */
  }

  const fetched = await fetchWeather(city);
  if (!fetched) {
    /* 拉取失败：过期旧缓存兜底，无缓存则 null（前端隐藏天气卡） */
    return cached ? fmt(city, cached) : null;
  }
  const doc = Object.assign({ city: city, updatedAt: time.now() }, fetched);
  try {
    await db.collection('weather_cache').doc(city).set({ data: doc });
  } catch (e) { /* 缓存回写失败不影响本次返回 */ }
  return fmt(city, doc);
}

/* ── 距离 ─────────────────────────────────────────────────────── */

function haversineKm(a, b) {
  const R = 6371;
  const rad = function (d) { return d * Math.PI / 180; };
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return Math.round(R * 2 * Math.asin(Math.sqrt(h)) * 10) / 10;
}

/* 城市名 → 坐标：本地表优先，表外城市经和风 geo 查 */
async function cityCoord(city) {
  const c = (config.CITIES || {})[city];
  if (c) return c;
  const loc = await qweatherLoc(city);
  if (!loc) return null;
  return { lat: Number(loc.lat), lon: Number(loc.lon) };
}

async function distanceKm(cityA, cityB) {
  if (!cityA || !cityB) return null;
  if (cityA === cityB) return 0;
  const [a, b] = await Promise.all([cityCoord(cityA), cityCoord(cityB)]);
  if (!a || !b) return null;
  return haversineKm(a, b);
}

module.exports = { weatherFor: weatherFor, distanceKm: distanceKm };
