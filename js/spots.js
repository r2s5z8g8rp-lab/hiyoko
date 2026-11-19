// 釣り場の保存（端末内 localStorage）
const KEY = 'hiyoko.spots.v1';

function safeGet() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function safeSet(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch { return false; }
}

export const listSpots = () => safeGet();
export const getSpot = (id) => safeGet().find((s) => s.id === id);

export function saveSpot(spot) {
  const list = safeGet();
  const now = new Date().toISOString();
  if (spot.id) {
    const i = list.findIndex((s) => s.id === spot.id);
    if (i >= 0) list[i] = { ...list[i], ...spot, updatedAt: now };
    else list.push({ ...spot, createdAt: now });
  } else {
    spot = { ...spot, id: `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, createdAt: now };
    list.push(spot);
  }
  safeSet(list);
  return spot;
}

export function deleteSpot(id) {
  safeSet(safeGet().filter((s) => s.id !== id));
}

export function exportSpots() {
  return JSON.stringify({ app: 'hiyoko-tsuribiyori', version: 1, spots: safeGet() }, null, 2);
}

export function importSpots(text) {
  const data = JSON.parse(text);
  const incoming = Array.isArray(data) ? data : data.spots;
  if (!Array.isArray(incoming)) throw new Error('形式が正しくありません');
  const list = safeGet();
  let added = 0;
  for (const s of incoming) {
    if (typeof s?.lat !== 'number' || typeof s?.lon !== 'number' || !s.name) continue;
    const i = list.findIndex((x) => x.id === s.id);
    if (i >= 0) list[i] = s; else { list.push(s); added++; }
  }
  safeSet(list);
  return added;
}
