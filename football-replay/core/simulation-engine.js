import {GOAL, EVENT_TYPES, BALL_TYPES} from './match-rules.js';

const isPt = o => o !== null && typeof o === 'object' && Number.isFinite(o.x) && Number.isFinite(o.y);
const byTime = (a, b) => a.t - b.t || a.id - b.id;
const lerp = (a, b, u) => ({x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u});

export const duration = events => events.reduce((m, e) => Math.max(m, e.t + e.dur), 0);

// Structural problem with an event (message) or null. Such events are ignored by stateAt.
export function malformed(setup, ev) {
  if (!ev || typeof ev !== 'object') return 'event is not an object';
  const has = id => Number.isInteger(id) && setup.players.some(p => p.id === id);
  if (!EVENT_TYPES.includes(ev.type)) return `unknown type: ${ev.type}`;
  if (!has(ev.actor)) return `unknown actor: ${ev.actor}`;
  if (!Number.isFinite(ev.t) || ev.t < 0) return 't must be a number >= 0';
  if (!Number.isFinite(ev.dur) || ev.dur <= 0) return 'dur must be a number > 0';
  if (['bend', 'lift'].some(k => ev[k] !== undefined && !Number.isFinite(ev[k]))) return 'bend/lift must be numbers';
  if ((ev.type === 'move' || ev.type === 'dribble') && !isPt(ev.to)) return `${ev.type} needs a 'to' point`;
  if (ev.type === 'tackle' && !has(ev.target)) return 'tackle needs a target player';
  if (['pass', 'cross'].includes(ev.type) && !has(ev.target) && !isPt(ev.target)) return `${ev.type} needs a player or point target`;
  if (ev.type === 'shot' && ev.target !== 'goal' && !has(ev.target) && !isPt(ev.target)) return 'shot needs goal, player or point target';
  return null;
}

const valid = (setup, events) => events.filter(e => !malformed(setup, e)).sort(byTime);

// Player position at t: walk the actor's own move/dribble events; each starts where the previous ended.
function posAt(setup, sorted, id, t) {
  const p = setup.players.find(q => q.id === id);
  let pos = {x: p.x, y: p.y};
  for (const e of sorted) {
    if (e.actor !== id || !e.to || e.t >= t) continue;
    const u = Math.min(1, (t - e.t) / e.dur);
    if (u < 1) return lerp(pos, e.to, u);
    pos = {x: e.to.x, y: e.to.y};
  }
  return pos;
}

// Ball at t derived only from the initial owner and the events (no keyframes, so no ghost ball).
// Also lists events it had to ignore, for the validator. Pass t=Infinity to see every issue.
export function resolveBall(setup, events, t) {
  const sorted = valid(setup, events);
  const team = id => setup.players.find(p => p.id === id).team;
  let owner = setup.ball.owner ?? null;
  let loose = {x: setup.ball.x, y: setup.ball.y};
  let busyUntil = -Infinity;
  const issues = [];
  const out = (pos, z, status) => ({ball: {x: pos.x, y: pos.y, z, owner: status === 'controlled' ? owner : null, status}, issues});

  for (const ev of sorted.filter(e => BALL_TYPES.includes(e.type))) {
    if (ev.t > t) break;
    if (ev.t < busyUntil) { issues.push({eventId: ev.id, code: 'overlap', message: 'ball events overlap in time'}); continue; }
    if (ev.type !== 'tackle' && owner !== ev.actor) {
      if (!ev.manual) { issues.push({eventId: ev.id, code: 'not-owner', message: `player ${ev.actor} does not have the ball`}); continue; }
      issues.push({eventId: ev.id, code: 'manual-teleport', message: `ball moved to player ${ev.actor} manually`});
      owner = ev.actor;
    }
    const end = ev.t + ev.dur;
    busyUntil = end;
    if (ev.type === 'dribble') continue;
    if (ev.type === 'tackle') {
      if (end <= t && ev.won && owner === ev.target) owner = ev.actor;
      continue;
    }
    const from = posAt(setup, sorted, ev.actor, ev.t);
    const tg = ev.target;
    const dest = tg === 'goal' ? GOAL[team(ev.actor)]
      : isPt(tg) ? tg : posAt(setup, sorted, tg, end);
    if (t < end) {
      const u = (t - ev.t) / ev.dur;
      const q = lerp(from, dest, u);
      const len = Math.hypot(dest.x - from.x, dest.y - from.y) || 1;
      const k = 4 * u * (1 - u);
      const off = (ev.bend ?? 0) * k;
      return out({x: q.x - (dest.y - from.y) / len * off, y: q.y + (dest.x - from.x) / len * off}, (ev.lift ?? 0) * k, 'in-transit');
    }
    owner = typeof tg === 'number' ? tg : null;
    loose = {x: dest.x, y: dest.y};
  }
  return owner === null ? out(loose, 0, 'loose') : out(posAt(setup, sorted, owner, t), 0, 'controlled');
}

// Pure: same inputs, same output, any call order.
export function stateAt(setup, events, t) {
  const sorted = valid(setup, events);
  return {
    players: setup.players.map(p => ({...p, ...posAt(setup, sorted, p.id, t)})),
    ball: resolveBall(setup, events, t).ball
  };
}
