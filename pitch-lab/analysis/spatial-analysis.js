// Exact metrics computed directly from positions. Distances are in pitch-width units.
const isTeam = (state, team) => state.players.filter(p => p.team === team);
// The lowest-numbered player of a team is the goalkeeper.
const outfield = (state, team) => {
  const ps = isTeam(state, team);
  if (!ps.length) return ps;
  const gk = Math.min(...ps.map(p => p.num));
  return ps.filter(p => p.num !== gk);
};
const flip = (team, x) => (team === 0 ? x : 1 - x);
const mean = a => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
const extent = a => (a.length ? Math.max(...a) - Math.min(...a) : 0);

export const distance = (a, b, aspect) => Math.hypot(a.x - b.x, (a.y - b.y) / aspect);

export function teamCentroid(state, team) {
  const ps = isTeam(state, team);
  return {x: mean(ps.map(p => p.x)), y: mean(ps.map(p => p.y))};
}

export const teamWidth = (state, team, aspect) => extent(outfield(state, team).map(p => p.y)) / aspect;
export const teamDepth = (state, team) => extent(outfield(state, team).map(p => p.x));

// 0 = own goal, 1 = opponent goal. A third with no players is null.
export function lineHeights(state, team) {
  const xs = outfield(state, team).map(p => flip(team, p.x));
  return {
    defence: mean(xs.filter(x => x < 1 / 3)),
    midfield: mean(xs.filter(x => x >= 1 / 3 && x < 2 / 3)),
    attack: mean(xs.filter(x => x >= 2 / 3)),
  };
}

// Convex hull area (monotone chain + shoelace) of outfield players.
export function compactness(state, team, aspect) {
  const pts = outfield(state, team).map(p => ({x: p.x, y: p.y / aspect}))
    .sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length < 3) return 0;
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const half = list => {
    const h = [];
    for (const p of list) {
      while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop();
      h.push(p);
    }
    h.pop();
    return h;
  };
  const hull = [...half(pts), ...half([...pts].reverse())];
  let area = 0;
  hull.forEach((p, i) => {
    const q = hull[(i + 1) % hull.length];
    area += p.x * q.y - q.x * p.y;
  });
  return Math.abs(area) / 2;
}

export function nearestOpponent(state, playerId, aspect) {
  const me = state.players.find(p => p.id === playerId);
  let best = null;
  for (const p of state.players) {
    if (p.team === me.team) continue;
    const d = distance(me, p, aspect);
    if (!best || d < best.distance) best = {id: p.id, distance: d};
  }
  return best;
}

export function spaceBetweenLines(state, team) {
  const {defence, attack} = lineHeights(state, team);
  return defence === null || attack === null ? null : attack - defence;
}
