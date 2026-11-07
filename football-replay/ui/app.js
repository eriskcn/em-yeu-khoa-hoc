import {createSetup} from '../core/match-state.js';
import {FORMATS} from '../core/match-rules.js';
import {stateAt} from '../core/simulation-engine.js';
import {drawPitch, toPx, playerRadius} from '../rendering/pitch-renderer.js';
import {drawPlayer} from '../rendering/player-renderer.js';
import {drawBall} from '../rendering/ball-renderer.js';
import {attachPointer} from '../interaction/pointer-controller.js';
import {createDragController} from '../interaction/drag-controller.js';
import {createToolbar} from './toolbar.js';

const FORMAT = 7;
const TEAM_COLORS = ['#1e6fd9', '#e03c31'];
const aspect = FORMATS[FORMAT].aspect;

const canvas = document.getElementById('pitch');
const ctx = canvas.getContext('2d');
let setup = createSetup(FORMAT);
let size = {w: 0, h: 0};
let queued = false;

// Draw once per change, not every frame.
function invalidate() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; render(); });
}

function render() {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = w / aspect;
  size = {w, h};
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const s = stateAt(setup), r = playerRadius(w);
  drawPitch(ctx, w, h);
  s.players.forEach(p => drawPlayer(ctx, toPx(p, w, h), r, TEAM_COLORS[p.team], p.num));
  drawBall(ctx, toPx(s.ball, w, h), r);
}

const drag = createDragController({
  getState: () => setup,
  setState: s => { setup = s; invalidate(); },
  getSize: () => size
});
attachPointer(canvas, drag);

createToolbar(document.getElementById('toolbar'), {
  label: FORMATS[FORMAT].label,
  onReset: () => { setup = createSetup(FORMAT); invalidate(); }
});

window.addEventListener('resize', invalidate);
render();
