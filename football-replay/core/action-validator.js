import {malformed, resolveBall} from './simulation-engine.js';

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
  const team = id => setup.players.find(p => p.id === id).team;
  for (const ev of good) {
    if ((ev.type === 'pass' || ev.type === 'cross') && typeof ev.target === 'number' && team(ev.target) !== team(ev.actor)) {
      issues.push({eventId: ev.id, level, code: 'opponent-target', message: `${ev.type} to an opponent`});
    }
  }
  return issues;
}
