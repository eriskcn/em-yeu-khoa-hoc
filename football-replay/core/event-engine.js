import {validateEvents} from './action-validator.js';

const sort = evs => [...evs].sort((a, b) => a.t - b.t || a.id - b.id);
const key = i => `${i.eventId}|${i.code}`;

// Accept `next` unless it introduces a rejected issue that `events` did not already have.
function commit(setup, events, next, mode) {
  if (!setup) throw new Error('setup is required to validate events');
  const issues = validateEvents(setup, next, mode);
  const old = new Set(validateEvents(setup, events, mode).map(key));
  return issues.some(i => i.level === 'rejected' && !old.has(key(i)))
    ? {events, issues}
    : {events: sort(next), issues};
}

// mode defaults to 'simulate'; setup is needed for the possession checks.
export function addEvent(events, ev, mode = 'simulate', setup) {
  const id = ev?.id ?? Math.max(0, ...events.map(e => e.id)) + 1;
  return commit(setup, events, [...events, {...ev, id}], mode);
}

export function updateEvent(events, id, patch, mode = 'simulate', setup) {
  if (!events.some(e => e.id === id)) {
    return {events, issues: [{eventId: id, level: 'rejected', code: 'not-found', message: `no event ${id}`}]};
  }
  return commit(setup, events, events.map(e => (e.id === id ? {...e, ...patch, id} : e)), mode);
}

export const removeEvent = (events, id) => events.filter(e => e.id !== id);
