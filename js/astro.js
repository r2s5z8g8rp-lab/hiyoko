// 天文計算（低精度・オフライン動作）
// 月齢・潮回り・日の出/日の入り・月の南中・潮汐の概算

export const SYNODIC = 29.530588853;
const RAD = Math.PI / 180;
const JST_OFFSET_H = 9;

const norm360 = (x) => ((x % 360) + 360) % 360;

export function julianDay(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

/** JSTの年月日・時刻からDateを作る */
export function jstDate(y, m, d, h = 0, min = 0) {
  return new Date(Date.UTC(y, m - 1, d, h - JST_OFFSET_H, min));
}

/** "YYYY-MM-DD" → {y,m,d} */
export function parseYmd(s) {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d };
}

/** Date → JSTの {y,m,d,h,min,dow} */
export function toJstParts(date) {
  const t = new Date(date.getTime() + JST_OFFSET_H * 3600000);
  return {
    y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(),
    h: t.getUTCHours(), min: t.getUTCMinutes(), dow: t.getUTCDay(),
  };
}

export function fmtTime(date) {
  if (!date || isNaN(date)) return '--:--';
  const p = toJstParts(date);
  return `${String(p.h).padStart(2, '0')}:${String(p.min).padStart(2, '0')}`;
}

export function ymdString(date) {
  const p = toJstParts(date);
  return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
}

export function addDays(ymd, n) {
  const { y, m, d } = parseYmd(ymd);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}

/** 太陽・月の黄経（度）。月は主要項のみ（誤差 ~0.3°） */
function sunMoon(date) {
  const d = julianDay(date) - 2451545.0;
  const g = norm360(357.529 + 0.98560028 * d); // 太陽平均近点角
  const sunLon = norm360(280.459 + 0.98564736 * d + 1.915 * Math.sin(g * RAD) + 0.020 * Math.sin(2 * g * RAD));
  const L = 218.316 + 13.176396 * d;
  const Mm = norm360(134.963 + 13.064993 * d);
  const D = norm360(297.850 + 12.190749 * d);
  const F = norm360(93.272 + 13.229350 * d);
  const moonLon = norm360(
    L + 6.289 * Math.sin(Mm * RAD) - 1.274 * Math.sin((Mm - 2 * D) * RAD) + 0.658 * Math.sin(2 * D * RAD)
    + 0.214 * Math.sin(2 * Mm * RAD) - 0.186 * Math.sin(g * RAD) - 0.114 * Math.sin(2 * F * RAD),
  );
  const moonLat = 5.128 * Math.sin(F * RAD);
  return { d, sunLon, moonLon, moonLat };
}

/** 月齢（日）。太陽と月の離角から算出 */
export function moonAge(date) {
  const { sunLon, moonLon } = sunMoon(date);
  return (norm360(moonLon - sunLon) / 360) * SYNODIC;
}

/** 輝面比 0..1 */
export function moonIllumination(age) {
  return (1 - Math.cos((2 * Math.PI * age) / SYNODIC)) / 2;
}

export function moonPhaseName(age) {
  const names = [
    [1.0, '新月', '🌑'], [5.5, '三日月', '🌒'], [9.0, '上弦', '🌓'], [13.5, '十三夜', '🌔'],
    [16.0, '満月', '🌕'], [20.5, '寝待月', '🌖'], [24.0, '下弦', '🌗'], [28.5, '有明月', '🌘'], [30, '新月', '🌑'],
  ];
  for (const [lim, name, icon] of names) if (age < lim) return { name, icon };
  return { name: '新月', icon: '🌑' };
}

/**
 * 潮回り（日本で一般的な旧暦日ベースの区分）
 * 旧暦日 ≒ その日の正午の月齢 + 1 として近似
 */
const TIDE_BY_LUNAR_DAY = [
  null,
  '大潮', '大潮', '大潮', '中潮', '中潮', '中潮', '小潮', '小潮', '小潮', '長潮',
  '若潮', '中潮', '中潮', '大潮', '大潮', '大潮', '大潮', '中潮', '中潮', '中潮',
  '中潮', '小潮', '小潮', '小潮', '長潮', '若潮', '中潮', '中潮', '中潮', '大潮',
];

export function tideName(ymd) {
  const { y, m, d } = parseYmd(ymd);
  const age = moonAge(jstDate(y, m, d, 12));
  const lunarDay = Math.min(30, Math.floor(age) + 1);
  return { name: TIDE_BY_LUNAR_DAY[lunarDay], lunarDay, age };
}

export const TIDE_INFO = {
  '大潮': { range: 1.0, desc: '干満差が最も大きく潮がよく動く。魚の活性が上がりやすい。', score: 30 },
  '中潮': { range: 0.8, desc: '潮の動きが適度で、釣りやすく安定した潮回り。', score: 26 },
  '小潮': { range: 0.5, desc: '干満差が小さく潮の動きが緩い。時合いが短くなりがち。', score: 14 },
  '長潮': { range: 0.4, desc: '潮の動きが最も緩やかでダラダラ続く。粘りが必要。', score: 10 },
  '若潮': { range: 0.5, desc: '長潮の翌日。潮が再び動き始め、徐々に良くなる。', score: 15 },
};

/** 日の出・日の入り・南中（sunrise equation） */
export function sunTimes(ymd, lat, lon) {
  const { y, m, d } = parseYmd(ymd);
  const jdNoon = Date.UTC(y, m - 1, d, 12) / 86400000 + 2440587.5;
  const n = Math.round(jdNoon - 2451545.0);
  const Jstar = n - lon / 360;
  const M = norm360(357.5291 + 0.98560028 * Jstar);
  const C = 1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD);
  const lambda = norm360(M + C + 180 + 102.9372);
  const Jtransit = 2451545.0 + Jstar + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * lambda * RAD);
  const sinDec = Math.sin(lambda * RAD) * Math.sin(23.4397 * RAD);
  const cosDec = Math.cos(Math.asin(sinDec));
  const jdToDate = (jd) => new Date((jd - 2440587.5) * 86400000);
  const hourAngle = (alt) => {
    const c = (Math.sin(alt * RAD) - Math.sin(lat * RAD) * sinDec) / (Math.cos(lat * RAD) * cosDec);
    if (c < -1 || c > 1) return null;
    return Math.acos(c) / RAD;
  };
  const w0 = hourAngle(-0.833);
  const wc = hourAngle(-6); // 市民薄明
  return {
    noon: jdToDate(Jtransit),
    sunrise: w0 == null ? null : jdToDate(Jtransit - w0 / 360),
    sunset: w0 == null ? null : jdToDate(Jtransit + w0 / 360),
    dawn: wc == null ? null : jdToDate(Jtransit - wc / 360),
    dusk: wc == null ? null : jdToDate(Jtransit + wc / 360),
  };
}

/** マズメ時（日の出/日の入りの前後） */
export function mazume(sun) {
  if (!sun.sunrise || !sun.sunset) return [];
  const H = 3600000;
  return [
    { label: '朝マズメ', start: new Date(sun.sunrise.getTime() - 1 * H), end: new Date(sun.sunrise.getTime() + 1 * H) },
    { label: '夕マズメ', start: new Date(sun.sunset.getTime() - 1 * H), end: new Date(sun.sunset.getTime() + 1 * H) },
  ];
}

/** 月の時角（度, -180..180） */
function moonHourAngle(date, lon) {
  const { d, moonLon, moonLat } = sunMoon(date);
  const eps = 23.4393 * RAD;
  const l = moonLon * RAD, b = moonLat * RAD;
  const ra = Math.atan2(Math.sin(l) * Math.cos(eps) - Math.tan(b) * Math.sin(eps), Math.cos(l)) / RAD;
  const gmst = norm360(280.46061837 + 360.98564736629 * d);
  let ha = norm360(gmst + lon - ra);
  if (ha > 180) ha -= 360;
  return ha;
}

/** 指定期間の月の南中時刻（上方通過）を列挙 */
export function moonTransits(from, to, lon) {
  const step = 6 * 60000;
  const out = [];
  let prevT = from.getTime();
  let prev = moonHourAngle(from, lon);
  for (let t = prevT + step; t <= to.getTime(); t += step) {
    const ha = moonHourAngle(new Date(t), lon);
    if (prev < 0 && ha >= 0 && prev > -90) {
      const frac = -prev / (ha - prev);
      out.push(new Date(prevT + frac * step));
    }
    prev = ha; prevT = t;
  }
  return out;
}

/**
 * 潮汐の概算（月の南中 + 高潮間隔）。
 * 実際の潮時は地形で大きく変わるため、予報データが取れない日の目安。
 * @param interval 高潮間隔（時間）。太平洋沿岸の多くで 4〜6 時間程度。
 */
export function estimateTides(ymd, lon, interval = 5.0) {
  const { y, m, d } = parseYmd(ymd);
  const dayStart = jstDate(y, m, d, 0);
  const dayEnd = jstDate(y, m, d, 24);
  const H = 3600000;
  const transits = moonTransits(new Date(dayStart.getTime() - 30 * H), new Date(dayEnd.getTime() + 6 * H), lon);
  const highs = [];
  for (const tr of transits) {
    highs.push(tr.getTime() + interval * H);
    highs.push(tr.getTime() + (interval + 12.42) * H); // 下方通過側の満潮
  }
  const uniq = [...new Set(highs.map((t) => Math.round(t / 60000)))].map((x) => x * 60000).sort((a, b) => a - b);
  const events = [];
  const half = 6.21 * H;
  for (const h of uniq) {
    events.push({ type: 'high', time: h });
    events.push({ type: 'low', time: h + half });
  }
  events.sort((a, b) => a.time - b.time);
  // 重複除去（近接イベント）
  const ev = events.filter((e, i) => i === 0 || e.time - events[i - 1].time > 2 * H);
  const tn = tideName(ymd);
  const amp = TIDE_INFO[tn.name].range; // 相対振幅
  const inDay = ev.filter((e) => e.time >= dayStart.getTime() && e.time < dayEnd.getTime())
    .map((e) => ({ type: e.type, time: new Date(e.time), height: e.type === 'high' ? amp : -amp }));
  // 曲線（10分刻み）: 隣接イベント間をコサイン補間
  const curve = [];
  for (let t = dayStart.getTime(); t <= dayEnd.getTime(); t += 10 * 60000) {
    const i = ev.findIndex((e) => e.time > t);
    if (i <= 0) continue;
    const a = ev[i - 1], b = ev[i];
    const ha = a.type === 'high' ? amp : -amp, hb = b.type === 'high' ? amp : -amp;
    const f = (t - a.time) / (b.time - a.time);
    curve.push({ time: new Date(t), height: ha + (hb - ha) * (1 - Math.cos(Math.PI * f)) / 2 });
  }
  return { events: inDay, curve, estimated: true, unit: '相対' };
}

/** 時系列（{time,height}）から満潮・干潮を抽出（放物線補間） */
export function findExtrema(series) {
  const out = [];
  for (let i = 1; i < series.length - 1; i++) {
    const a = series[i - 1].height, b = series[i].height, c = series[i + 1].height;
    if (a == null || b == null || c == null) continue;
    const isMax = b > a && b >= c, isMin = b < a && b <= c;
    if (!isMax && !isMin) continue;
    const denom = a - 2 * b + c;
    const off = denom === 0 ? 0 : (0.5 * (a - c)) / denom; // -0.5..0.5
    const dt = series[i + 1].time - series[i].time;
    const time = new Date(series[i].time.getTime() + off * dt);
    const height = b - 0.25 * (a - c) * off;
    out.push({ type: isMax ? 'high' : 'low', time, height });
  }
  return out;
}

/** 潮の動き（上げ/下げ・何分）を返す */
export function tideStage(events, time) {
  const t = time.getTime();
  for (let i = 0; i < events.length - 1; i++) {
    const a = events[i], b = events[i + 1];
    if (t >= a.time.getTime() && t <= b.time.getTime()) {
      const f = (t - a.time) / (b.time - a.time);
      const bu = Math.min(10, Math.max(0, Math.round(f * 10)));
      return { dir: a.type === 'low' ? '上げ' : '下げ', bu, frac: f };
    }
  }
  return null;
}
