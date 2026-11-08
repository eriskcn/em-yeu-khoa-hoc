// Pointer Events for mouse, pen and touch. Handlers get canvas CSS pixels.
// down() returns true to start a gesture; the pointer is then captured until up/cancel.
// Optional pinch(factor, cx, cy) / panBy(dx, dy): while two pointers are down, any single-pointer
// gesture is cancelled via up() and these are called instead.
export function attachPointer(canvas, {down, move, up, pinch, panBy}) {
  let active = null;
  const pts = new Map();
  const pt = e => {
    const r = canvas.getBoundingClientRect();
    return {x: e.clientX - r.left, y: e.clientY - r.top};
  };
  const two = () => {
    const [a, b] = [...pts.values()];
    return {cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y)};
  };
  const end = e => {
    pts.delete(e.pointerId);
    if (active !== e.pointerId) return;
    active = null;
    up();
  };
  canvas.addEventListener('pointerdown', e => {
    pts.set(e.pointerId, pt(e));
    if (pts.size === 2 && (pinch || panBy)) {
      if (active !== null) { active = null; up(); }
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    if (active !== null || pts.size > 1 || !down(pt(e))) return;
    active = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    if (pts.size === 2 && (pinch || panBy)) {
      const before = two();
      pts.set(e.pointerId, pt(e));
      const after = two();
      if (pinch && before.d > 0) pinch(after.d / before.d, after.cx, after.cy);
      if (panBy) panBy(after.cx - before.cx, after.cy - before.cy);
      return;
    }
    pts.set(e.pointerId, pt(e));
    if (active === e.pointerId) move(pt(e));
  });
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
}
