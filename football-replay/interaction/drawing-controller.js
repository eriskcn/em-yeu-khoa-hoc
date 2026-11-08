// Turns pointer gestures (canvas CSS pixels) into annotation data. Same contract as pointer-controller.
import {toNorm, toPx} from '../rendering/pitch-renderer.js';

const MIN_PX = 6, CLOSE_PX = 12, MIN_STEP = 0.004, MAX_FREEHAND = 300;
const DRAG_TOOLS = ['arrow', 'line', 'curve', 'circle', 'freehand', 'defline', 'lane'];
const PRESS_COLOR = '#ef4444', LANE_WIDTH = 0.02;
const clamp = v => Math.min(1, Math.max(0, v));

export function createDrawingController({getTool, getSize, onCommit, onDraft, onTextRequest}) {
  let tool = null, startPx = null, endPx = null, pts = [], verts = [];

  const norm = pt => {
    const {w, h} = getSize();
    const n = toNorm(pt, w, h);
    return {x: clamp(n.x), y: clamp(n.y)};
  };

  // Curve control point: midpoint pushed perpendicular by 20% of the length, in pixels so it looks perpendicular.
  function shapePts(end) {
    if (tool === 'freehand') return pts;
    const s = norm(startPx), e = norm(end);
    if (tool === 'defline') { // snap to the dominant axis
      const horiz = Math.abs(end.x - startPx.x) >= Math.abs(end.y - startPx.y);
      return [s, horiz ? {x: e.x, y: s.y} : {x: s.x, y: e.y}];
    }
    if (tool !== 'curve') return [s, e];
    const dx = end.x - startPx.x, dy = end.y - startPx.y;
    return [s, norm({x: (startPx.x + end.x) / 2 - dy * 0.2, y: (startPx.y + end.y) / 2 + dx * 0.2}), e];
  }

  function down(pt) {
    const t = getTool();
    if (t === 'text') { onTextRequest(norm(pt)); return false; }
    if (t === 'area' || t === 'press') {
      const {w, h} = getSize();
      const near = v => { const q = toPx(v, w, h); return Math.hypot(q.x - pt.x, q.y - pt.y) <= CLOSE_PX; };
      const lastNear = verts.length && near(verts[verts.length - 1]);
      if (verts.length >= 3 && (near(verts[0]) || lastNear)) { // first vertex, or double-click
        const done = verts;
        verts = [];
        onDraft(null);
        onCommit(t === 'press' ? {type: t, pts: done, color: PRESS_COLOR} : {type: t, pts: done});
      } else if (!lastNear) {
        verts = [...verts, norm(pt)];
        onDraft({type: t, pts: verts, ...(t === 'press' && {color: PRESS_COLOR})});
      }
      return false;
    }
    if (!DRAG_TOOLS.includes(t)) return false;
    tool = t; startPx = endPx = pt; pts = [norm(pt)];
    return true;
  }

  function move(pt) {
    if (!tool) return;
    endPx = pt;
    if (tool === 'freehand') {
      const p = norm(pt), l = pts[pts.length - 1];
      if (pts.length < MAX_FREEHAND && Math.hypot(p.x - l.x, p.y - l.y) >= MIN_STEP) pts = [...pts, p];
    }
    onDraft({type: tool, pts: shapePts(pt)});
  }

  function up() {
    if (!tool) return;
    const long = Math.hypot(endPx.x - startPx.x, endPx.y - startPx.y) >= MIN_PX;
    const out = {type: tool, pts: shapePts(endPx)};
    const ok = long && out.pts.length >= 2;
    tool = null;
    onDraft(null);
    if (ok) onCommit(out.type === 'lane' ? {...out, width: LANE_WIDTH} : out);
  }

  function cancel() { tool = null; verts = []; onDraft(null); }

  return {down, move, up, cancel};
}
