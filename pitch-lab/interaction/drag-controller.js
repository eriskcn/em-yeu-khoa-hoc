import {movePlayer, moveBall} from '../core/match-state.js';
import {toPx, toNorm, hitRadius} from '../rendering/pitch-renderer.js';

// Drag players and the ball to set positions. getSize() returns the pitch size in pixels.
export function createDragController({getState, setState, getSize}) {
  let target = null;

  const hit = pt => {
    const {w, h} = getSize(), s = getState(), r = hitRadius(w);
    const near = p => Math.hypot(pt.x - toPx(p, w, h).x, pt.y - toPx(p, w, h).y) < r;
    if (near(s.ball)) return {ball: true};
    const p = [...s.players].reverse().find(near);
    return p ? {id: p.id} : null;
  };

  return {
    down(pt) {
      target = hit(pt);
      return target !== null;
    },
    move(pt) {
      const {w, h} = getSize(), n = toNorm(pt, w, h);
      setState(target.ball ? moveBall(getState(), n.x, n.y) : movePlayer(getState(), target.id, n.x, n.y));
    },
    up() { target = null; }
  };
}
