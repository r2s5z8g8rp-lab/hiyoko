import { fmtTime, ymdString, addDays, parseYmd, TIDE_INFO } from './astro.js';
import { weatherLabel, windDir, geocode } from './weather.js';
import { FISH, SPOT_TYPES, recommendFish, timeLabel } from './fish.js';
import { listSpots, getSpot, saveSpot, deleteSpot, exportSpots, importSpots } from './spots.js';
import { buildReport } from './planner.js';
import { renderTideChart } from './chart.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DOW = ['日', '月', '火', '水', '木', '金', '土'];
const fmtDate = (ymd) => { const { y, m, d } = parseYmd(ymd); const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); return `${m}/${d}(${DOW[dow]})`; };
const n1 = (v) => (v == null ? '-' : Number(v).toFixed(1));

const state = { temp: null, map: null, markers: [], tempMarker: null };

/* ---------- タブ ---------- */
function showTab(name) {
  for (const b of document.querySelectorAll('[data-tab]')) b.setAttribute('aria-selected', String(b.dataset.tab === name));
  for (const p of document.querySelectorAll('.tab-panel')) p.hidden = p.id !== `tab-${name}`;
  if (name === 'spots') initMap();
  try { localStorage.setItem('hiyoko.tab', name); } catch { /* noop */ }
}
document.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));

/* ---------- 釣行プラン ---------- */
function fillSpotSelect(selectedId) {
  const sel = $('#plan-spot');
  const spots = listSpots();
  const opts = spots.map((s) => `<option value="${s.id}">${esc(s.name)}（${SPOT_TYPES[s.type]?.label ?? ''}）</option>`);
  if (state.temp) opts.unshift(`<option value="__temp">📍 ${esc(state.temp.name)}（未登録）</option>`);
  opts.push('<option value="__add">＋ 釣り場を追加する…</option>');
  sel.innerHTML = opts.join('');
  if (selectedId && [...sel.options].some((o) => o.value === selectedId)) sel.value = selectedId;
  $('#plan-hint').textContent = spots.length || state.temp ? '' : 'まずは「釣り場」タブで地図から釣り場を登録してください（現在地や地名検索も使えます）。';
}
$('#plan-spot').addEventListener('change', (e) => {
  if (e.target.value === '__add') { showTab('spots'); fillSpotSelect(); }
});

function fillQuickDates() {
  const today = ymdString(new Date());
  const btns = [['今日', today], ['明日', addDays(today, 1)]];
  const dow = new Date(Date.UTC(...Object.values(parseYmd(today)).map((v, i) => (i === 1 ? v - 1 : v)))).getUTCDay();
  btns.push(['次の土曜', addDays(today, ((6 - dow + 7) % 7) || 7)]);
  btns.push(['次の日曜', addDays(today, ((7 - dow) % 7) || 7)]);
  $('#quick-dates').innerHTML = btns.map(([l, d]) => `<button type="button" class="chip" data-date="${d}">${l} ${fmtDate(d)}</button>`).join('');
  $('#quick-dates').onclick = (e) => {
    const d = e.target.closest('[data-date]')?.dataset.date;
    if (d) { $('#plan-date').value = d; runPlan(); }
  };
}

function currentSpot() {
  const v = $('#plan-spot').value;
  if (v === '__temp') return state.temp;
  return getSpot(v);
}

$('#plan-form').addEventListener('submit', (e) => { e.preventDefault(); runPlan(); });

async function runPlan() {
  const spot = currentSpot();
  const ymd = $('#plan-date').value;
  const out = $('#report');
  if (!spot) { out.innerHTML = '<div class="card empty">釣り場を選んでください。</div>'; return; }
  if (!ymd) return;
  out.innerHTML = '<div class="card loading">潮・天気・波を調べています…</div>';
  try {
    const r = await buildReport(spot, ymd);
    renderReport(r);
  } catch (err) {
    console.error(err);
    out.innerHTML = `<div class="card error">調べられませんでした：${esc(err.message)}</div>`;
  }
}

function section(title, body, cls = '') {
  return `<section class="card ${cls}"><h3>${title}</h3>${body}</section>`;
}

function renderReport(r) {
  const w = r.weather;
  const [wIcon, wText] = w ? weatherLabel(w.weather_code) : ['', ''];
  const tInfo = TIDE_INFO[r.tideName.name];
  const ev = r.tides?.events ?? [];
  const evRows = ev.map((e) => `<li class="tide-ev ${e.type}"><span>${e.type === 'high' ? '満潮' : '干潮'}</span><strong>${fmtTime(e.time)}</strong>${r.tides.unit === 'm' ? `<small>${Math.round(e.height * 100)}cm</small>` : ''}</li>`).join('');

  const summary = `
    <div class="summary-head">
      <div>
        <div class="spot-name">${esc(r.spot.name)}</div>
        <div class="muted">${fmtDate(r.ymd)} ・ ${SPOT_TYPES[r.type]?.label ?? ''}</div>
      </div>
      <div class="score" aria-label="釣り日和スコア ${r.score.score}点">
        <span class="score-mark">${r.score.mark}</span>
        <span class="score-num">${r.score.score}</span>
        <span class="score-label">${r.score.label}</span>
      </div>
    </div>
    <div class="stats">
      ${r.isSea ? `<div class="stat"><span>潮回り</span><strong>${r.tideName.name}</strong></div>` : ''}
      <div class="stat"><span>月齢</span><strong>${r.moon.icon} ${r.moon.age.toFixed(1)}</strong><small>${r.moon.name}・旧暦${r.tideName.lunarDay}日頃</small></div>
      <div class="stat"><span>日の出</span><strong>${fmtTime(r.sun.sunrise)}</strong></div>
      <div class="stat"><span>日の入り</span><strong>${fmtTime(r.sun.sunset)}</strong></div>
      ${w ? `<div class="stat"><span>天気</span><strong>${wIcon} ${wText}</strong><small>${n1(w.temperature_2m_min)}〜${n1(w.temperature_2m_max)}℃ ・ 降水${w.precipitation_probability_max ?? '-'}%</small></div>
      <div class="stat"><span>風</span><strong>${windDir(w.wind_direction_10m_dominant)} ${n1(w.wind_speed_10m_max)}m/s</strong><small>最大瞬間 ${n1(w.wind_gusts_10m_max)}m/s</small></div>` : ''}
      ${r.waveMax != null ? `<div class="stat"><span>波高(最大)</span><strong>${n1(r.waveMax)}m</strong></div>` : ''}
      ${r.waterTemp != null ? `<div class="stat"><span>水温(海面)</span><strong>${n1(r.waterTemp)}℃</strong></div>` : ''}
    </div>
    ${r.score.warnings.length ? `<ul class="warnings">${r.score.warnings.map((x) => `<li>⚠ ${esc(x)}</li>`).join('')}</ul>` : ''}
    ${!r.inForecastRange ? '<p class="note">この日は天気予報の範囲外（16日先まで）です。潮回り・月齢・日の出入りは計算値で表示しています。</p>' : ''}
    ${r.errors.length ? `<p class="note">天気・海況データの一部を取得できませんでした（${esc([...new Set(r.errors)].join(' / '))}）。潮回り・月齢・日の出入りは計算値で表示しています。</p>` : ''}`;

  const tideSec = r.isSea ? section('潮汐', `
    <p class="lead"><strong>${r.tideName.name}</strong>：${tInfo.desc}</p>
    <ul class="tide-events">${evRows}</ul>
    <div class="chart-wrap" id="tide-chart"></div>
    <p class="legend"><span class="lg lg-line"></span>潮位 <span class="lg lg-maz"></span>マズメ <span class="lg lg-night"></span>夜間</p>
    ${r.tides.estimated ? '<p class="note">※ 潮位予報データがないため、月の南中時刻と高潮間隔から潮時を<strong>概算</strong>しています（グラフの高さは目安）。正確な時刻は最寄り港の潮見表で確認してください。</p>' : '<p class="note">※ 潮位はOpen-Meteoの海洋モデル予測（平均海面基準）。港内・湾奥では時刻が前後することがあります。</p>'}
  `) : '';

  const jiaiSec = section('狙い目の時間帯（時合い）', `
    <ul class="jiai">${r.jiai.map((j) => `<li class="${j.star ? 'star' : ''}"><span class="time">${fmtTime(j.start)}〜${fmtTime(j.end)}</span><span>${j.star ? '★ ' : ''}${esc(j.label)}</span></li>`).join('')}</ul>
    <p class="note">★ はマズメと潮の動きが重なる、特にチャンスの大きい時間帯です。</p>`);

  const tableSec = r.table.length ? section('時間ごとの天気・風・波', `
    <div class="table-scroll"><table class="wx">
      <thead><tr><th>時刻</th><th>天気</th><th>気温</th><th>降水</th><th>風</th>${r.isSea ? '<th>波</th><th>潮</th>' : ''}</tr></thead>
      <tbody>${r.table.map((h) => `<tr>
        <td>${fmtTime(h.time)}</td><td title="${weatherLabel(h.weather_code)[1]}">${weatherLabel(h.weather_code)[0]}</td>
        <td>${n1(h.temperature_2m)}℃</td><td>${h.precipitation_probability ?? '-'}%</td>
        <td>${windDir(h.wind_direction_10m)} ${n1(h.wind_speed_10m)}</td>
        ${r.isSea ? `<td>${n1(h.wave_height)}m</td><td>${h.stage ? `${h.stage.dir}${h.stage.bu}分` : '-'}</td>` : ''}
      </tr>`).join('')}</tbody>
    </table></div>`) : '';

  const fishSec = section(`この日のおすすめ魚種（${SPOT_TYPES[r.type]?.label ?? ''}）`, r.fish.length ? `
    <div class="fish-grid">${r.fish.slice(0, 6).map((f, i) => fishCard(f.fish, f.reasons, i === 0)).join('')}</div>` : '<p>この月・釣り場タイプで代表的な魚種が見つかりませんでした。</p>');

  const pointSec = section('ポイントの狙い方', `
    <ul class="points">${r.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
    ${r.spot.memo ? `<p class="memo"><strong>メモ：</strong>${esc(r.spot.memo)}</p>` : ''}`);

  const weekSec = section('前後の日と比べる（7日間）', `
    <div class="week">${r.week.map((d) => {
      const [ic] = d.daily ? weatherLabel(d.daily.weather_code) : ['–'];
      return `<button class="day ${d.ymd === r.ymd ? 'current' : ''}" data-date="${d.ymd}">
        <span class="d">${fmtDate(d.ymd)}</span><span class="ic">${ic}</span>
        ${r.isSea ? `<span class="t">${d.tide}</span>` : ''}
        <span class="s">${d.daily || !r.isSea ? `${d.mark} ${d.score}` : `${d.mark}`}</span>
        ${d.daily ? `<small>${n1(d.daily.wind_speed_10m_max)}m/s</small>` : '<small>予報外</small>'}
      </button>`;
    }).join('')}</div>`);

  const checklist = section('持ち物・安全チェック', `
    <ul class="check">
      <li>ライフジャケット（堤防・磯・船では必須）</li>
      <li>${r.sun.sunrise && fmtTime(r.sun.sunrise) ? `朝マズメ狙いなら ${fmtTime(new Date(r.sun.sunrise.getTime() - 3600000))} には現地でスタンバイ。ヘッドライトを忘れずに` : 'ヘッドライト'}</li>
      <li>釣り場の立入禁止・駐車ルール、遊漁券の要否を確認</li>
      <li>ゴミは必ず持ち帰る</li>
    </ul>`);

  $('#report').innerHTML = section('サマリー', summary, 'summary') + tideSec + jiaiSec + fishSec + pointSec + tableSec + weekSec + checklist;
  if (r.isSea) renderTideChart($('#tide-chart'), r);
  $('#report .week').addEventListener('click', (e) => {
    const d = e.target.closest('[data-date]')?.dataset.date;
    if (d) { $('#plan-date').value = d; runPlan(); }
  });
}

function fishCard(f, reasons = [], top = false) {
  return `<article class="fish ${top ? 'top' : ''}">
    <h4><span aria-hidden="true">${f.icon}</span> ${esc(f.name)} <small>${'★'.repeat(f.level)}<span class="muted">${'★'.repeat(3 - f.level)}</span></small></h4>
    ${reasons.length ? `<p class="reasons">${reasons.map(esc).join(' ・ ')}</p>` : ''}
    <dl>
      <dt>釣り方</dt><dd>${f.methods.map(esc).join('、')}</dd>
      <dt>時間</dt><dd>${f.time.map(timeLabel).join('・')}</dd>
      <dt>潮</dt><dd>${esc(f.tide)}</dd>
      <dt>最盛期</dt><dd>${f.peak.join('・')}月</dd>
    </dl>
    <p class="tip">💡 ${esc(f.tip)}</p>
  </article>`;
}

/* ---------- 釣り場（地図） ---------- */
function initMap() {
  if (state.map) { setTimeout(() => state.map.invalidateSize(), 50); return; }
  if (typeof L === 'undefined') { $('#map').innerHTML = '<p class="note">地図を読み込めませんでした（オフライン？）。緯度・経度を直接入力して登録できます。<button class="btn small" id="btn-manual">手入力で登録</button></p>'; $('#btn-manual').onclick = () => openSpotDialog({ lat: 35.0, lon: 139.0 }); return; }
  const spots = listSpots();
  const center = spots.length ? [spots.at(-1).lat, spots.at(-1).lon] : [35.3, 139.6];
  state.map = L.map('map', { zoomControl: true }).setView(center, spots.length ? 11 : 8);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(state.map);
  state.map.on('click', (e) => openSpotDialog({ lat: +e.latlng.lat.toFixed(5), lon: +e.latlng.lng.toFixed(5) }));
  refreshMarkers();
}

function refreshMarkers() {
  if (!state.map) return;
  state.markers.forEach((m) => m.remove());
  const icon = L.divIcon({ className: 'spot-pin', html: '<span>🎣</span>', iconSize: [32, 32], iconAnchor: [16, 30], popupAnchor: [0, -26] });
  state.markers = listSpots().map((s) => L.marker([s.lat, s.lon], { icon, title: s.name }).addTo(state.map)
    .bindPopup(`<strong>${esc(s.name)}</strong><br>${SPOT_TYPES[s.type]?.label ?? ''}<br><button class="btn small" data-plan="${s.id}">この釣り場で調べる</button>`));
}

document.addEventListener('click', (e) => {
  const plan = e.target.closest('[data-plan]')?.dataset.plan;
  if (plan) { fillSpotSelect(plan); showTab('plan'); runPlan(); }
});

function renderSpotList() {
  const spots = listSpots();
  $('#spot-list').innerHTML = spots.length ? spots.map((s) => `
    <li class="card spot">
      <div class="spot-main">
        <strong>${esc(s.name)}</strong>
        <span class="tag">${SPOT_TYPES[s.type]?.label ?? ''}</span>
        <div class="muted small">${s.lat.toFixed(4)}, ${s.lon.toFixed(4)}</div>
        ${s.memo ? `<p class="memo">${esc(s.memo)}</p>` : ''}
      </div>
      <div class="spot-actions">
        <button class="btn primary small" data-plan="${s.id}">調べる</button>
        <button class="btn small" data-focus="${s.id}">地図</button>
        <button class="btn small" data-edit="${s.id}">編集</button>
        <button class="btn small danger" data-del="${s.id}">削除</button>
      </div>
    </li>`).join('') : '<li class="card empty">まだ釣り場がありません。地図をタップして登録しましょう。</li>';
}

$('#spot-list').addEventListener('click', (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  if (t.dataset.edit) openSpotDialog(getSpot(t.dataset.edit));
  if (t.dataset.focus && state.map) { const s = getSpot(t.dataset.focus); state.map.setView([s.lat, s.lon], 14); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  if (t.dataset.del) {
    const s = getSpot(t.dataset.del);
    if (confirm(`「${s.name}」を削除しますか？`)) { deleteSpot(s.id); renderAllSpots(); }
  }
});

function renderAllSpots(selectId) { renderSpotList(); refreshMarkers(); fillSpotSelect(selectId ?? $('#plan-spot').value); }

const dlg = $('#spot-dialog');
const form = $('#spot-form');
form.elements.type.innerHTML = Object.entries(SPOT_TYPES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');

function openSpotDialog(s = {}) {
  form.reset();
  $('#spot-dialog-title').textContent = s.id ? '釣り場を編集' : '釣り場を登録';
  for (const k of ['id', 'name', 'type', 'lat', 'lon', 'memo', 'interval']) if (s[k] != null) form.elements[k].value = s[k];
  if (!s.id && !s.name) form.elements.name.value = s.suggest || '';
  dlg.showModal();
}

form.addEventListener('submit', (e) => {
  if (e.submitter?.value !== 'save') return;
  e.preventDefault();
  if (!form.reportValidity()) return;
  const f = form.elements;
  const spot = saveSpot({
    id: f.id.value || undefined, name: f.name.value.trim(), type: f.type.value,
    lat: Number(f.lat.value), lon: Number(f.lon.value), memo: f.memo.value.trim(), interval: Number(f.interval.value) || 5,
  });
  dlg.close();
  renderAllSpots(spot.id);
});

$('#search-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = $('#search-q').value.trim();
  const ul = $('#search-results');
  if (!q) return;
  ul.innerHTML = '<li class="muted">検索中…</li>';
  try {
    const rs = await geocode(q);
    ul.innerHTML = rs.length ? rs.map((r, i) => `<li><button class="link" data-i="${i}">${esc(r.name)} <small class="muted">${esc(r.detail)}</small></button></li>`).join('') : '<li class="muted">見つかりませんでした。地図を動かして直接タップしてください。</li>';
    ul.onclick = (ev) => {
      const i = ev.target.closest('[data-i]')?.dataset.i;
      if (i == null) return;
      const r = rs[i];
      ul.innerHTML = '';
      if (state.map) {
        state.map.setView([r.lat, r.lon], 13);
        state.tempMarker?.remove();
        state.tempMarker = L.circleMarker([r.lat, r.lon], { radius: 8 }).addTo(state.map)
          .bindPopup(`${esc(r.name)}<br><small>正確な釣り座の位置で地図をタップして登録してください</small>`).openPopup();
      }
    };
  } catch (err) {
    ul.innerHTML = `<li class="error">検索できませんでした：${esc(err.message)}</li>`;
  }
});

$('#btn-here').addEventListener('click', () => {
  if (!navigator.geolocation) return alert('この端末では位置情報が使えません');
  navigator.geolocation.getCurrentPosition((pos) => {
    const lat = +pos.coords.latitude.toFixed(5), lon = +pos.coords.longitude.toFixed(5);
    state.map?.setView([lat, lon], 14);
    state.temp = { name: '現在地', lat, lon, type: 'pier' };
    openSpotDialog({ lat, lon, suggest: '' });
    fillSpotSelect();
  }, (err) => alert(`現在地を取得できませんでした：${err.message}`), { enableHighAccuracy: true, timeout: 10000 });
});

$('#btn-export').addEventListener('click', () => {
  const blob = new Blob([exportSpots()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `tsuribiyori-spots-${ymdString(new Date())}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$('#file-import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try { const n = importSpots(await file.text()); alert(`${n}件の釣り場を読み込みました`); renderAllSpots(); }
  catch (err) { alert(`読み込みに失敗しました：${err.message}`); }
  e.target.value = '';
});

/* ---------- 魚種図鑑 ---------- */
function initFish() {
  const month = parseYmd(ymdString(new Date())).m;
  $('#fish-month').innerHTML = Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}" ${i + 1 === month ? 'selected' : ''}>${i + 1}月</option>`).join('');
  $('#fish-spot').innerHTML = '<option value="">すべて</option>' + Object.entries(SPOT_TYPES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
  const render = () => {
    const m = Number($('#fish-month').value), t = $('#fish-spot').value || null;
    const rec = recommendFish({ month: m, spotType: t });
    const off = FISH.filter((f) => (!t || f.spots.includes(t)) && !rec.some((r) => r.fish.id === f.id));
    $('#fish-list').innerHTML = rec.map((r) => fishCard(r.fish, r.reasons)).join('')
      + (off.length ? `<h3 class="off-head">シーズンオフ</h3>${off.map((f) => fishCard(f)).join('')}` : '');
  };
  $('#fish-month').onchange = render;
  $('#fish-spot').onchange = render;
  render();
}

/* ---------- 起動 ---------- */
$('#plan-date').value = ymdString(new Date());
fillQuickDates();
renderSpotList();
fillSpotSelect();
initFish();
let initialTab = 'plan';
try { initialTab = localStorage.getItem('hiyoko.tab') || 'plan'; } catch { /* noop */ }
showTab(listSpots().length ? initialTab : 'spots');
if (listSpots().length && initialTab === 'plan') runPlan();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
