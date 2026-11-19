// Open-Meteo（APIキー不要・無料）から天気・風・波・水温・潮位を取得
import { addDays, ymdString } from './astro.js';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine';
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

export const FORECAST_MAX_DAYS = 16;
const PAST_MAX_DAYS = 90;

const cache = new Map();
async function getJson(url) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.t < 30 * 60000) return hit.data;
  const res = await fetch(url);
  if (!res.ok) {
    let reason = `HTTP ${res.status}`;
    try { reason = (await res.json()).reason || reason; } catch { /* noop */ }
    throw new Error(reason);
  }
  const data = await res.json();
  cache.set(url, { t: Date.now(), data });
  return data;
}

const parseLocal = (s) => new Date(s.length === 10 ? `${s}T00:00:00+09:00` : `${s}:00+09:00`);

function toRows(block) {
  if (!block?.time) return [];
  const keys = Object.keys(block).filter((k) => k !== 'time');
  return block.time.map((t, i) => {
    const row = { time: parseLocal(t), key: t };
    for (const k of keys) row[k] = block[k][i];
    return row;
  });
}

/** 取得可能な日付範囲にクランプ。範囲外なら null */
export function fetchRange(ymd, days) {
  const today = ymdString(new Date());
  const last = addDays(today, FORECAST_MAX_DAYS - 1);
  const first = addDays(today, -PAST_MAX_DAYS);
  if (ymd > last || ymd < first) return null;
  // 潮位の極値判定用に前日も取得
  const start = addDays(ymd, -1) < first ? ymd : addDays(ymd, -1);
  let end = addDays(ymd, days);
  if (end > last) end = last;
  return { start, end };
}

export async function fetchWeather(lat, lon, ymd, days = 6) {
  const r = fetchRange(ymd, days);
  if (!r) return null;
  const q = new URLSearchParams({
    latitude: lat.toFixed(4), longitude: lon.toFixed(4), timezone: 'Asia/Tokyo', wind_speed_unit: 'ms',
    start_date: r.start, end_date: r.end,
    hourly: 'temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant',
  });
  const data = await getJson(`${FORECAST_URL}?${q}`);
  return { hourly: toRows(data.hourly), daily: toRows(data.daily) };
}

export async function fetchMarine(lat, lon, ymd, days = 6) {
  const r = fetchRange(ymd, days);
  if (!r) return null;
  const q = new URLSearchParams({
    latitude: lat.toFixed(4), longitude: lon.toFixed(4), timezone: 'Asia/Tokyo',
    start_date: r.start, end_date: r.end,
    hourly: 'wave_height,wave_direction,wave_period,sea_surface_temperature,sea_level_height_msl',
    daily: 'wave_height_max',
  });
  const data = await getJson(`${MARINE_URL}?${q}`);
  return { hourly: toRows(data.hourly), daily: toRows(data.daily) };
}

export async function geocode(name) {
  const q = new URLSearchParams({ name, count: '8', language: 'ja', format: 'json' });
  const data = await getJson(`${GEOCODE_URL}?${q}`);
  return (data.results || []).map((r) => ({
    name: r.name,
    detail: [r.admin1, r.admin2, r.country].filter(Boolean).join(' / '),
    lat: r.latitude, lon: r.longitude,
  }));
}

const WMO = {
  0: ['☀️', '快晴'], 1: ['🌤️', '晴れ'], 2: ['⛅', '晴れ時々曇り'], 3: ['☁️', '曇り'],
  45: ['🌫️', '霧'], 48: ['🌫️', '霧（着氷）'],
  51: ['🌦️', '弱い霧雨'], 53: ['🌦️', '霧雨'], 55: ['🌧️', '強い霧雨'], 56: ['🌧️', '着氷性の霧雨'], 57: ['🌧️', '着氷性の霧雨'],
  61: ['🌦️', '小雨'], 63: ['🌧️', '雨'], 65: ['🌧️', '大雨'], 66: ['🌧️', '着氷性の雨'], 67: ['🌧️', '着氷性の雨'],
  71: ['🌨️', '小雪'], 73: ['🌨️', '雪'], 75: ['❄️', '大雪'], 77: ['🌨️', '霧雪'],
  80: ['🌦️', 'にわか雨'], 81: ['🌧️', '強いにわか雨'], 82: ['⛈️', '激しいにわか雨'], 85: ['🌨️', 'にわか雪'], 86: ['❄️', '強いにわか雪'],
  95: ['⛈️', '雷雨'], 96: ['⛈️', '雷雨（ひょう）'], 99: ['⛈️', '激しい雷雨（ひょう）'],
};
export const weatherLabel = (code) => WMO[code] ?? ['❔', '不明'];

const DIRS = ['北', '北北東', '北東', '東北東', '東', '東南東', '南東', '南南東', '南', '南南西', '南西', '西南西', '西', '西北西', '北西', '北北西'];
export const windDir = (deg) => (deg == null ? '-' : DIRS[Math.round(deg / 22.5) % 16]);
