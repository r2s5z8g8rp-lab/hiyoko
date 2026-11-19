// 釣行プラン：天文・潮汐・天気・魚種を統合してレポートを作る
import {
  sunTimes, mazume, tideName, moonAge, moonIllumination, moonPhaseName, estimateTides, findExtrema,
  tideStage, jstDate, parseYmd, addDays, TIDE_INFO,
} from './astro.js';
import { fetchWeather, fetchMarine } from './weather.js';
import { recommendFish, SPOT_TYPES, POINT_GUIDE } from './fish.js';

const H = 3600000;

function dayBounds(ymd) {
  const { y, m, d } = parseYmd(ymd);
  return { start: jstDate(y, m, d, 0), end: jstDate(y, m, d, 24) };
}

const within = (rows, ymd) => rows.filter((r) => r.key.startsWith(ymd));

/** 予報の潮位から当日の潮汐を作る。データ不足なら null */
export function tidesFromMarine(marine, ymd) {
  if (!marine) return null;
  const { start, end } = dayBounds(ymd);
  const series = marine.hourly
    .filter((r) => r.sea_level_height_msl != null && r.time >= start - 6 * H && r.time <= end.getTime() + 6 * H)
    .map((r) => ({ time: r.time, height: r.sea_level_height_msl }));
  if (series.length < 24) return null;
  const all = findExtrema(series);
  const events = all.filter((e) => e.time >= start && e.time < end);
  const curve = series.filter((p) => p.time >= start && p.time <= end);
  if (!events.length) return null;
  return { events, allEvents: all, curve, estimated: false, unit: 'm' };
}

/** 釣り日和スコア */
export function scoreDay({ tide, isSea, daily, waveMax }) {
  let score = 40;
  const notes = [];
  const warnings = [];
  if (isSea) {
    score += TIDE_INFO[tide].score;
    notes.push(`${tide}（潮回り +${TIDE_INFO[tide].score}）`);
  } else {
    score += 22;
  }
  if (daily) {
    const pp = daily.precipitation_probability_max;
    const wind = daily.wind_speed_10m_max;
    const gust = daily.wind_gusts_10m_max;
    if (pp != null) {
      if (pp >= 70) { score -= 15; notes.push(`降水確率${pp}%（-15）`); }
      else if (pp >= 40) { score -= 7; notes.push(`降水確率${pp}%（-7）`); }
      else score += 5;
    }
    if (wind != null) {
      if (wind >= 12) { score -= 25; warnings.push(`強風（最大${wind.toFixed(1)}m/s）：釣行は控えるのが安全です`); }
      else if (wind >= 8) { score -= 12; warnings.push(`風が強め（最大${wind.toFixed(1)}m/s）：軽い仕掛けは扱いにくい`); }
      else if (wind >= 5) score -= 4;
      else score += 5;
    }
    if (gust != null && gust >= 15) warnings.push(`突風に注意（最大瞬間${gust.toFixed(1)}m/s）`);
    if (daily.weather_code >= 95) { score -= 25; warnings.push('雷の可能性：竿は避雷針になります。屋外の釣りは中止を'); }
  }
  if (isSea && waveMax != null) {
    if (waveMax >= 2.5) { score -= 20; warnings.push(`高波（最大${waveMax.toFixed(1)}m）：磯・堤防先端は危険`); }
    else if (waveMax >= 1.5) { score -= 8; warnings.push(`波やや高め（最大${waveMax.toFixed(1)}m）`); }
  }
  score = Math.max(0, Math.min(100, Math.round(score)));
  const rank = score >= 75 ? ['◎', '釣り日和'] : score >= 55 ? ['○', 'まずまず'] : score >= 35 ? ['△', 'いまいち'] : ['×', '厳しい'];
  return { score, mark: rank[0], label: rank[1], notes, warnings };
}

/** 時合い候補：潮の動く時間帯（3〜7分）とマズメの重なり */
export function findJiai(tides, maz, isSea) {
  const out = [];
  if (isSea && tides) {
    const ev = tides.allEvents || tides.events;
    for (let i = 0; i < ev.length - 1; i++) {
      const a = ev[i], b = ev[i + 1];
      const span = b.time - a.time;
      const s = new Date(a.time.getTime() + span * 0.3), e = new Date(a.time.getTime() + span * 0.7);
      out.push({ start: s, end: e, label: a.type === 'low' ? '上げ3〜7分（潮がよく動く）' : '下げ3〜7分（潮がよく動く）', kind: 'tide' });
    }
    for (const e of tides.events) {
      out.push({ start: new Date(e.time.getTime() - 0.75 * H), end: new Date(e.time.getTime() - 0.1 * H),
        label: e.type === 'high' ? '満潮前の潮止まり直前' : '干潮前の潮止まり直前', kind: 'turn' });
    }
  }
  for (const m of maz) out.push({ start: m.start, end: m.end, label: m.label, kind: 'mazume' });
  // マズメと潮の動きが重なる時間帯を特に強調
  for (const w of out) {
    if (w.kind === 'mazume') continue;
    w.star = maz.some((m) => w.start < m.end && w.end > m.start);
  }
  for (const w of out) if (w.kind === 'mazume') w.star = out.some((x) => x.kind !== 'mazume' && x.star && x.start < w.end && x.end > w.start);
  return out.sort((a, b) => a.start - b.start);
}

export async function buildReport(spot, ymd) {
  const type = spot.type || 'pier';
  const isSea = SPOT_TYPES[type]?.sea ?? true;
  const { start, end } = dayBounds(ymd);
  const sun = sunTimes(ymd, spot.lat, spot.lon);
  const maz = mazume(sun);
  const tn = tideName(ymd);
  const age = moonAge(jstDate(...Object.values(parseYmd(ymd)), 12));
  const moon = { age, illum: moonIllumination(age), ...moonPhaseName(age) };
  const month = parseYmd(ymd).m;

  const [wRes, mRes] = await Promise.allSettled([
    fetchWeather(spot.lat, spot.lon, ymd),
    isSea ? fetchMarine(spot.lat, spot.lon, ymd) : Promise.resolve(null),
  ]);
  const weather = wRes.status === 'fulfilled' ? wRes.value : null;
  const marine = mRes.status === 'fulfilled' ? mRes.value : null;
  const errors = [wRes, mRes].filter((r) => r.status === 'rejected').map((r) => r.reason?.message || String(r.reason));

  let tides = null;
  if (isSea) {
    tides = tidesFromMarine(marine, ymd);
    if (!tides) {
      const est = estimateTides(ymd, spot.lon, Number(spot.interval) || 5);
      const est2 = estimateTides(addDays(ymd, 1), spot.lon, Number(spot.interval) || 5);
      const estPrev = estimateTides(addDays(ymd, -1), spot.lon, Number(spot.interval) || 5);
      tides = { ...est, allEvents: [...estPrev.events.slice(-1), ...est.events, ...est2.events.slice(0, 1)] };
    }
  }

  const dailyW = weather ? within(weather.daily, ymd)[0] : null;
  const hourlyW = weather ? within(weather.hourly, ymd) : [];
  const hourlyM = marine ? within(marine.hourly, ymd) : [];
  const sstVals = hourlyM.map((r) => r.sea_surface_temperature).filter((v) => v != null);
  const waterTemp = sstVals.length ? sstVals.reduce((a, b) => a + b, 0) / sstVals.length : null;
  const waveVals = hourlyM.map((r) => r.wave_height).filter((v) => v != null);
  const waveMax = waveVals.length ? Math.max(...waveVals) : null;

  const score = scoreDay({ tide: tn.name, isSea, daily: dailyW, waveMax });
  const jiai = findJiai(tides, maz, isSea);
  const fish = recommendFish({ month, spotType: type, waterTemp });

  // 3時間ごとの天気表
  const table = hourlyW.filter((r) => r.time.getTime() % (3 * H) === 0).map((r) => {
    const m = hourlyM.find((x) => x.key === r.key);
    return { ...r, wave_height: m?.wave_height, sea_surface_temperature: m?.sea_surface_temperature,
      stage: tides ? tideStage(tides.allEvents || tides.events, r.time) : null };
  });

  // 週間（予報が取れる範囲）
  const week = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(ymd, i);
    const dw = weather ? within(weather.daily, d)[0] : null;
    const dm = marine ? within(marine.daily, d)[0] : null;
    const t = tideName(d);
    week.push({ ymd: d, tide: t.name, daily: dw, waveMax: dm?.wave_height_max ?? null,
      ...scoreDay({ tide: t.name, isSea, daily: dw, waveMax: dm?.wave_height_max ?? null }) });
  }

  return {
    spot, ymd, type, isSea, sun, maz, tideName: tn, moon, tides, weather: dailyW, table, waterTemp, waveMax,
    score, jiai, fish, week, points: POINT_GUIDE[type] || [], errors, hasForecast: !!weather, dayStart: start, dayEnd: end,
  };
}
