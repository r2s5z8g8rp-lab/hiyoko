// 潮位グラフ（SVG）: 夜間・マズメの帯、満干潮マーカー、ホバー/タップで値表示
import { fmtTime, tideStage } from './astro.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (name, attrs = {}, text) => {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
};

export function renderTideChart(container, report) {
  const { tides, dayStart, dayEnd, sun, maz } = report;
  container.innerHTML = '';
  if (!tides?.curve?.length) return;
  const W = Math.max(320, Math.round(container.clientWidth) || 640), Hh = W < 500 ? 200 : 220, pad = { l: 40, r: 12, t: 26, b: 26 };
  const iw = W - pad.l - pad.r, ih = Hh - pad.t - pad.b;
  const t0 = dayStart.getTime(), t1 = dayEnd.getTime();
  const hs = tides.curve.map((p) => p.height);
  let lo = Math.min(...hs), hi = Math.max(...hs);
  const margin = (hi - lo) * 0.18 || 0.1;
  lo -= margin; hi += margin;
  const x = (t) => pad.l + ((t - t0) / (t1 - t0)) * iw;
  const y = (h) => pad.t + (1 - (h - lo) / (hi - lo)) * ih;
  const cm = tides.unit === 'm';
  const fmtH = (h) => (cm ? `${Math.round(h * 100)}cm` : '');

  const svg = el('svg', { viewBox: `0 0 ${W} ${Hh}`, class: 'tide-chart', role: 'img',
    'aria-label': `潮位グラフ。${tides.events.map((e) => `${e.type === 'high' ? '満潮' : '干潮'}${fmtTime(e.time)}`).join('、')}` });

  // 夜間帯
  if (sun.sunrise && sun.sunset) {
    svg.append(el('rect', { x: pad.l, y: pad.t, width: x(sun.sunrise) - pad.l, height: ih, class: 'band-night' }));
    svg.append(el('rect', { x: x(sun.sunset), y: pad.t, width: pad.l + iw - x(sun.sunset), height: ih, class: 'band-night' }));
  }
  for (const m of maz) {
    const xs = Math.max(pad.l, x(m.start)), xe = Math.min(pad.l + iw, x(m.end));
    svg.append(el('rect', { x: xs, y: pad.t, width: xe - xs, height: ih, class: 'band-mazume' }));
    svg.append(el('text', { x: (xs + xe) / 2, y: pad.t - 8, class: 'band-label', 'text-anchor': 'middle' }, m.label));
  }
  // グリッド（3時間ごと）
  const hStep = W < 420 ? 6 : 3;
  for (let h = 0; h <= 24; h += hStep) {
    const gx = x(t0 + h * 3600000);
    svg.append(el('line', { x1: gx, x2: gx, y1: pad.t, y2: pad.t + ih, class: 'grid' }));
    svg.append(el('text', { x: gx, y: Hh - 8, class: 'axis', 'text-anchor': 'middle' }, `${h}時`));
  }
  if (cm) {
    const step = (hi - lo) > 1.2 ? 0.5 : (hi - lo) > 0.6 ? 0.25 : 0.1;
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) {
      svg.append(el('line', { x1: pad.l, x2: pad.l + iw, y1: y(v), y2: y(v), class: 'grid' }));
      svg.append(el('text', { x: pad.l - 6, y: y(v) + 4, class: 'axis', 'text-anchor': 'end' }, `${Math.round(v * 100)}`));
    }
    svg.append(el('text', { x: 4, y: pad.t - 8, class: 'axis' }, 'cm'));
  }
  // 潮位曲線
  const d = tides.curve.map((p, i) => `${i ? 'L' : 'M'}${x(p.time).toFixed(1)},${y(p.height).toFixed(1)}`).join('');
  const area = `${d}L${x(tides.curve.at(-1).time).toFixed(1)},${pad.t + ih}L${x(tides.curve[0].time).toFixed(1)},${pad.t + ih}Z`;
  svg.append(el('path', { d: area, class: 'tide-area' }));
  svg.append(el('path', { d, class: 'tide-line' }));
  // 満干潮マーカー
  for (const e of tides.events) {
    const ex = x(e.time), ey = y(e.height);
    svg.append(el('circle', { cx: ex, cy: ey, r: 4.5, class: 'tide-dot' }));
    const above = e.type === 'high';
    svg.append(el('text', { x: ex, y: above ? ey - 10 : ey + 18, class: 'tide-label', 'text-anchor': 'middle' },
      `${above ? '満' : '干'} ${fmtTime(e.time)}`));
  }
  // ホバー
  const cross = el('line', { y1: pad.t, y2: pad.t + ih, class: 'crosshair', visibility: 'hidden' });
  const dot = el('circle', { r: 5, class: 'hover-dot', visibility: 'hidden' });
  svg.append(cross, dot);
  const hit = el('rect', { x: pad.l, y: pad.t, width: iw, height: ih, fill: 'transparent' });
  svg.append(hit);
  const tip = document.createElement('div');
  tip.className = 'chart-tip';
  tip.hidden = true;

  const evAll = tides.allEvents || tides.events;
  const move = (ev) => {
    const r = svg.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * W;
    const t = t0 + ((px - pad.l) / iw) * (t1 - t0);
    let best = tides.curve[0];
    for (const p of tides.curve) if (Math.abs(p.time - t) < Math.abs(best.time - t)) best = p;
    const bx = x(best.time), by = y(best.height);
    cross.setAttribute('x1', bx); cross.setAttribute('x2', bx); cross.setAttribute('visibility', 'visible');
    dot.setAttribute('cx', bx); dot.setAttribute('cy', by); dot.setAttribute('visibility', 'visible');
    const st = tideStage(evAll, best.time);
    tip.innerHTML = `<strong>${fmtTime(best.time)}</strong>${cm ? ` ・ 潮位 ${fmtH(best.height)}` : ''}${st ? `<br>${st.dir}${st.bu}分` : ''}`;
    tip.hidden = false;
    const left = (bx / W) * r.width;
    tip.style.left = `${Math.min(Math.max(left, 50), r.width - 50)}px`;
    tip.style.top = `${(by / Hh) * r.height - 12}px`;
  };
  const leave = () => { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); };
  hit.addEventListener('pointermove', move);
  hit.addEventListener('pointerdown', move);
  hit.addEventListener('pointerleave', leave);

  container.append(svg, tip);
}
