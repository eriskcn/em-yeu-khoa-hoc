const EPS = 1e-9;

export const eventsAt = (events, t) => events.filter(e => e.t <= t && t <= e.t + e.dur);

export function nextEventTime(events, t) {
  let best = null;
  for (const e of events) if (e.t > t + EPS && (best === null || e.t < best)) best = e.t;
  return best;
}

export function prevEventTime(events, t) {
  let best = null;
  for (const e of events) if (e.t < t - EPS && (best === null || e.t > best)) best = e.t;
  return best;
}

export const clampTime = (t, duration) => Math.min(Math.max(t, 0), duration);
