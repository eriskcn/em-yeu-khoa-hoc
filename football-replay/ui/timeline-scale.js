// Pure helpers for the layer timeline: view = {t0 (s at left edge), pps (px per s)}.
export const STEP = 0.05;
const MIN_STEP_PX = 4;
const MAX_PPS = 1000;

export const timeToPx = (t, v) => (t - v.t0) * v.pps;
export const pxToTime = (x, v) => x / v.pps + v.t0;
export const snap = (t, step = STEP) => Number((Math.round(t / step) * step).toFixed(4));
// Snap step grows in multiples of STEP when zoomed out so one step stays >= 4 px.
export const snapStep = pps => STEP * Math.max(1, Math.ceil(MIN_STEP_PX / (STEP * pps) - 1e-9));

const fitPps = (duration, width) => width / Math.max(duration, STEP);
export const fitView = (duration, width) => ({t0: 0, pps: fitPps(duration, width)});

// Zoom-out stops at "fit"; pan keeps the window inside [0, duration].
export function clampView(v, duration, width) {
  const pps = Math.min(MAX_PPS, Math.max(fitPps(duration, width), v.pps));
  const t0 = Math.min(Math.max(0, duration - width / pps), Math.max(0, v.t0));
  return {t0, pps};
}

export function zoomAbout(v, factor, px, duration, width) {
  const t = pxToTime(px, v);
  const pps = clampView({t0: 0, pps: v.pps * factor}, duration, width).pps;
  return clampView({pps, t0: t - px / pps}, duration, width);
}

// Rows: one per actor (team, then shirt number), then Subs, then Match. Overlapping events in a row get a lane.
export function layers(events, players) {
  const rows = new Map();
  const add = (key, order, e) => {
    if (!rows.has(key)) rows.set(key, {key, order, events: []});
    rows.get(key).events.push(e);
  };
  for (const e of events) {
    const p = players.find(q => q.id === e.actor);
    if (e.type === 'sub') add('sub', [2], e);
    else if (e.type === 'phase' || !p) add('match', [3], e);
    else add(`p${p.id}`, [0, p.team, p.num ?? p.id], e);
  }
  const out = [...rows.values()].sort((a, b) => a.order.reduce((d, x, i) => d || x - (b.order[i] ?? 0), 0));
  for (const r of out) {
    const ends = [];
    r.events.sort((a, b) => a.t - b.t);
    r.laneOf = r.events.map(e => {
      let l = ends.findIndex(x => x <= e.t);
      if (l < 0) l = ends.length;
      ends[l] = e.t + (e.dur || 0);
      return l;
    });
    r.lanes = ends.length;
  }
  return out;
}
