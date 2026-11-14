// Pure zoom/pan state. Screen = base * scale + (ox, oy), base = unzoomed canvas px.
export const identity = {scale: 1, ox: 0, oy: 0};
export const MIN_SCALE = 1, MAX_SCALE = 4;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
// Keeps the canvas covering the viewport: ox in [w*(1-scale), 0].
const fit = (v, w, h) => w == null ? v
  : {scale: v.scale, ox: clamp(v.ox, w * (1 - v.scale), 0), oy: clamp(v.oy, h * (1 - v.scale), 0)};

// (cx, cy) in screen px stays fixed. Pass canvas w,h to also keep the pitch on screen.
export function zoomAt(view, factor, cx, cy, w, h) {
  const scale = clamp(view.scale * factor, MIN_SCALE, MAX_SCALE), k = scale / view.scale;
  return fit({scale, ox: cx - (cx - view.ox) * k, oy: cy - (cy - view.oy) * k}, w, h);
}

export const pan = (view, dx, dy, w, h) => fit({scale: view.scale, ox: view.ox + dx, oy: view.oy + dy}, w, h);
