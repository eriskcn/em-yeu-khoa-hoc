// Pure multi-select state for player ids. All functions return new state.
const clamp01 = v => Math.min(1, Math.max(0, v)); // same rule as core/match-state.js

export const createSelection = () => ({ids: new Set()});
export const has = (sel, id) => sel.ids.has(id);
export const set = (sel, ids) => ({...sel, ids: new Set(ids)});
export const clear = sel => set(sel, []);
export const toggle = (sel, id) => {
  const ids = new Set(sel.ids);
  if (!ids.delete(id)) ids.add(id);
  return {...sel, ids};
};

// rect corners in any order; edges inclusive.
export function playersInRect(players, {x0, y0, x1, y1}) {
  const [lx, hx] = [Math.min(x0, x1), Math.max(x0, x1)];
  const [ly, hy] = [Math.min(y0, y1), Math.max(y0, y1)];
  return players.filter(p => p.x >= lx && p.x <= hx && p.y >= ly && p.y <= hy).map(p => p.id);
}

// ids: iterable of player ids (e.g. sel.ids).
export function moveSelected(setup, ids, dx, dy) {
  const s = new Set(ids);
  return {...setup, players: setup.players.map(p => (s.has(p.id) ? {...p, x: clamp01(p.x + dx), y: clamp01(p.y + dy)} : p))};
}
