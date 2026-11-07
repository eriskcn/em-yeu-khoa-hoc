// Pointer Events for mouse, pen and touch. Handlers get canvas CSS pixels.
// down() returns true to start a gesture; the pointer is then captured until up/cancel.
export function attachPointer(canvas, {down, move, up}) {
  let active = null;
  const pt = e => {
    const r = canvas.getBoundingClientRect();
    return {x: e.clientX - r.left, y: e.clientY - r.top};
  };
  const end = e => {
    if (active !== e.pointerId) return;
    active = null;
    up();
  };
  canvas.addEventListener('pointerdown', e => {
    if (active !== null || !down(pt(e))) return;
    active = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => { if (active === e.pointerId) move(pt(e)); });
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
}
