// Pass statistics from the event list, and lane risk (approximate).

export const passEvents = events =>
  events.filter(e => (e.type === 'pass' || e.type === 'cross') && typeof e.target === 'number');

// counts[actor][target] within the team; totals count passes made and received per player.
export function passMatrix(events, team, players) {
  const ids = new Set(players.filter(p => p.team === team).map(p => p.id));
  const counts = {};
  const made = {};
  const received = {};
  for (const e of passEvents(events)) {
    if (!ids.has(e.actor) || !ids.has(e.target)) continue;
    counts[e.actor] ??= {};
    counts[e.actor][e.target] = (counts[e.actor][e.target] ?? 0) + 1;
    made[e.actor] = (made[e.actor] ?? 0) + 1;
    received[e.target] = (received[e.target] ?? 0) + 1;
  }
  return {counts, totals: {made, received}};
}

// Chains of passes where each actor is the previous target; events are taken in time order.
export function passSequence(events) {
  const seqs = [];
  for (const e of [...passEvents(events)].sort((a, b) => a.t - b.t)) {
    const cur = seqs[seqs.length - 1];
    if (cur && cur[cur.length - 1].target === e.actor) cur.push(e);
    else seqs.push([e]);
  }
  return seqs;
}

const LANE_RADIUS = 0.04;

// Approximate: only straight-line proximity of opponents; ignores ball speed, interception timing and movement.
export function laneRisk(state, fromId, toId, aspect) {
  const from = state.players.find(p => p.id === fromId);
  const to = state.players.find(p => p.id === toId);
  const sx = to.x - from.x, sy = (to.y - from.y) / aspect;
  const len2 = sx * sx + sy * sy;
  let near = 0;
  let closest = null;
  for (const p of state.players) {
    if (p.team === from.team) continue;
    const px = p.x - from.x, py = (p.y - from.y) / aspect;
    const k = len2 ? Math.max(0, Math.min(1, (px * sx + py * sy) / len2)) : 0;
    const d = Math.hypot(px - k * sx, py - k * sy);
    if (d <= LANE_RADIUS) near++;
    if (closest === null || d < closest) closest = d;
  }
  return {opponentsNear: near, closest};
}

// Approximate: sampled every `step` seconds, so short possessions can be missed.
export function possessionShare(stateAt, duration, step = 0.1) {
  const n = {team0: 0, team1: 0, loose: 0};
  let total = 0;
  for (let t = 0; t <= duration; t += step) {
    const s = stateAt(t);
    const owner = s.ball.owner == null ? undefined : s.players.find(p => p.id === s.ball.owner);
    n[owner ? `team${owner.team}` : 'loose']++;
    total++;
  }
  return total ? {team0: n.team0 / total, team1: n.team1 / total, loose: n.loose / total} : n;
}
