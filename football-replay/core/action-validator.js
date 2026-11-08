import {FORMATS} from './match-rules.js';
import {malformed, resolveBall, stateAt} from './simulation-engine.js';

// Edit mode flags rule breaks; simulate mode rejects them. Malformed data is rejected in both.
export function validateEvents(setup, events, mode = 'simulate') {
  const level = mode === 'edit' ? 'flagged' : 'rejected';
  const issues = [];
  const seen = new Set();
  const good = [];
  for (const ev of events) {
    const msg = malformed(setup, ev);
    if (msg) { issues.push({eventId: ev?.id, level: 'rejected', code: 'malformed', message: msg}); continue; }
    if (seen.has(ev.id)) { issues.push({eventId: ev.id, level: 'rejected', code: 'duplicate-id', message: `duplicate id ${ev.id}`}); continue; }
    seen.add(ev.id);
    good.push(ev);
  }
  for (const i of resolveBall(setup, good, Infinity).issues) {
    issues.push({...i, level: i.code === 'manual-teleport' ? 'flagged' : level});
  }
  const end = new Map(); // actor -> end of their previous move/dribble
  for (const ev of good.filter(e => e.type === 'move' || e.type === 'dribble').sort((a, b) => a.t - b.t || a.id - b.id)) {
    const prev = end.get(ev.actor) ?? -Infinity;
    if (ev.t < prev && !issues.some(i => i.eventId === ev.id && i.code === 'overlap')) {
      issues.push({eventId: ev.id, level, code: 'overlap', message: `player ${ev.actor} is already moving`});
    }
    end.set(ev.actor, Math.max(prev, ev.t + ev.dur));
  }
  const team = id => setup.players.find(p => p.id === id).team;
  for (const ev of good) {
    if ((ev.type === 'pass' || ev.type === 'cross') && typeof ev.target === 'number' && team(ev.target) !== team(ev.actor)) {
      issues.push({eventId: ev.id, level, code: 'opponent-target', message: `${ev.type} to an opponent`});
    }
  }
  if (mode === 'simulate' && FORMATS[setup.format]?.offside) {
    for (const ev of good) {
      if ((ev.type === 'pass' || ev.type === 'cross') && typeof ev.target === 'number' && offside(setup, good, ev)) {
        issues.push({eventId: ev.id, level: 'warning', code: 'offside', message: `${ev.type} to a player in an offside position`});
      }
    }
  }
  const used = [0, 0];
  const off = new Set();
  const maxSubs = FORMATS[setup.format].maxSubs;
  for (const ev of good.filter(e => e.type === 'sub').sort((a, b) => a.t - b.t || a.id - b.id)) {
    if (off.has(ev.off)) issues.push({eventId: ev.id, level, code: 'already-subbed', message: `player ${ev.off} was already subbed off`});
    else if (++used[ev.team] > maxSubs) issues.push({eventId: ev.id, level, code: 'max-subs', message: `more than ${maxSubs} substitutions for team ${ev.team}`});
    off.add(ev.off);
  }
  return issues;
}

// Receiver is in the attacking half and ahead of both the ball and the second-last opponent, at the event start.
function offside(setup, events, ev) {
  const {players, ball} = stateAt(setup, events, ev.t);
  const r = players.find(p => p.id === ev.target);
  if (r.team !== players.find(p => p.id === ev.actor).team) return false;
  const dir = r.team === 0 ? 1 : -1;
  const a = x => x * dir; // distance along the attacking direction
  const line = players.filter(p => p.team !== r.team).map(p => a(p.x)).sort((u, v) => v - u)[1];
  return a(r.x) > .5 * dir && a(r.x) > a(ball.x) && a(r.x) > line;
}
