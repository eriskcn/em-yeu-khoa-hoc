// Pure long-press timer. start(pt) arms it; move(pt) past `slop` px or cancel() disarms; onFire(pt) after `ms`.
// setTimer/clearTimer are injectable for tests.
export function createLongPress({ms = 500, slop = 10, onFire, setTimer = setTimeout, clearTimer = clearTimeout}) {
  let id = null, from = null;
  const cancel = () => { if (id !== null) clearTimer(id); id = from = null; };
  return {
    start(pt) { cancel(); from = pt; id = setTimer(() => { const p = from; id = from = null; onFire(p); }, ms); },
    move(pt) { if (from && Math.hypot(pt.x - from.x, pt.y - from.y) > slop) cancel(); },
    cancel
  };
}
