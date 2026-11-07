import {createSetup, setOwner} from '../core/match-state.js';
import {FORMATS} from '../core/match-rules.js';
import {stateAt, duration} from '../core/simulation-engine.js';
import {addEvent, removeEvent} from '../core/event-engine.js';
import {validateEvents} from '../core/action-validator.js';
import {createAnnotations, addAnnotation, clearAnnotations, serializeAnnotations, restoreAnnotations} from '../core/annotation-state.js';
import {createReplay} from '../replay/replay-engine.js';
import {nextEventTime, prevEventTime} from '../replay/timeline.js';
import {createHistory} from '../replay/snapshot-manager.js';
import {analyze} from '../analysis/tactical-analyzer.js';
import {drawPitch, toPx, toNorm, playerRadius} from '../rendering/pitch-renderer.js';
import {drawPlayer} from '../rendering/player-renderer.js';
import {drawBall} from '../rendering/ball-renderer.js';
import {drawAnnotations, drawDraft} from '../rendering/annotation-renderer.js';
import {attachPointer} from '../interaction/pointer-controller.js';
import {createDragController} from '../interaction/drag-controller.js';
import {createDrawingController} from '../interaction/drawing-controller.js';
import {createToolbar} from './toolbar.js';
import {createTimelinePanel} from './timeline-panel.js';
import {createAnalysisPanel} from './analysis-panel.js';

const FORMAT = 7;
const TEAM_COLORS = ['#1e6fd9', '#e03c31'];
const aspect = FORMATS[FORMAT].aspect;
const DUR = {pass: .8, cross: 1.2, shot: .7, dribble: 1, move: 1};
const EVENT_TOOLS = Object.keys(DUR);
const DRAW_TOOLS = ['arrow', 'line', 'curve', 'circle', 'area', 'freehand', 'text'];
const FLIGHT = ['pass', 'cross', 'shot'];
const clamp01 = v => Math.min(1, Math.max(0, v));

const canvas = document.getElementById('pitch');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

let setup = createSetup(FORMAT);
let events = [];
let annos = createAnnotations();
let tool = 'drag', mode = 'simulate';
let t = 0, selectedId = null, pending = null, draft = null, hideDrawings = false, speed = 1;
let size = {w: 0, h: 0};
let queued = false;

const say = msg => { statusEl.textContent = msg; };
const history = createHistory(100);
const snapshot = () => JSON.stringify({setup, events, annotations: serializeAnnotations(annos)});
history.reset(snapshot());

// Report events that the current setup/mode no longer accepts (setup edits can break them).
function checkEvents() {
  const issues = validateEvents(setup, events, mode);
  if (issues.length) say(`${issues.length} event issue(s): ${issues[0].message}`);
}
function commit() { history.push(snapshot()); checkEvents(); }

function apply(snap) {
  if (!snap) return;
  try {
    const d = JSON.parse(snap);
    if (d.setup.players.length !== setup.players.length) throw new Error('bad setup');
    annos = restoreAnnotations(d.annotations);
    setup = d.setup;
    events = d.events;
    selectedId = null;
    replay.seek(t);
  } catch { say('Could not restore that state.'); }
  invalidate();
}

const replay = createReplay({
  getDuration: () => duration(events),
  onTime: x => { t = x; invalidate(); },
  onPlayState: () => invalidate()
});

function invalidate() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; render(); });
}

function drawFlights(w, h) {
  events.filter(e => FLIGHT.includes(e.type) && (e.id === selectedId || (t >= e.t && t <= e.t + e.dur))).forEach(e => {
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const b = stateAt(setup, events, e.t + e.dur * i / 24).ball, q = toPx(b, w, h);
      i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
    }
    ctx.strokeStyle = e.id === selectedId ? 'rgba(251,191,36,.9)' : 'rgba(255,255,255,.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  });
}

function render() {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = w / aspect;
  size = {w, h};
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const s = stateAt(setup, events, t), r = playerRadius(w);
  drawPitch(ctx, w, h);
  drawFlights(w, h);
  if (!hideDrawings) drawAnnotations(ctx, w, h, annos.items, {t});
  drawDraft(ctx, w, h, draft);
  s.players.forEach(p => {
    const px = toPx(p, w, h);
    drawPlayer(ctx, px, r, TEAM_COLORS[p.team], p.num);
    if (p.id === pending || p.id === s.ball.owner) {
      ctx.beginPath();
      ctx.arc(px.x, px.y, r * 1.45, 0, Math.PI * 2);
      ctx.strokeStyle = p.id === pending ? '#22d3ee' : '#fbbf24';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  });
  drawBall(ctx, toPx(s.ball, w, h), r);

  timeline.update({t, duration: duration(events), events, playing: replay.isPlaying(), selectedId,
    canUndo: history.canUndo(), canRedo: history.canRedo(), speed});
  analysisPanel.update(analyze({state: s, events, aspect, t, duration: duration(events),
    stateAt: x => stateAt(setup, events, x)}));
}

// --- events -----------------------------------------------------------------
function playerAt(pt) {
  const {w, h} = size, r = playerRadius(w);
  return [...stateAt(setup, events, t).players].reverse().find(p => {
    const q = toPx(p, w, h);
    return Math.hypot(pt.x - q.x, pt.y - q.y) < r * 1.2;
  });
}

function addEv(ev) {
  const res = addEvent(events, ev, mode, setup);
  if (res.events === events) {
    say(res.issues.filter(i => i.level === 'rejected').map(i => i.message).join('; ') || 'Event not added.');
    return;
  }
  const before = new Set(events.map(e => e.id));
  events = res.events;
  selectedId = events.find(e => !before.has(e.id)).id;
  commit();
  if (res.issues.length) say(`Added with warning: ${res.issues[0].message}`);
  replay.seek(ev.t + ev.dur); // ready to chain the next action from where this one ends
}

function deleteSelected() {
  if (selectedId === null) { say('Select an event marker on the timeline first.'); return; }
  events = removeEvent(events, selectedId);
  selectedId = null;
  commit();
  replay.seek(t);
  invalidate();
}

function clickTool(pt) {
  const p = playerAt(pt);
  if (tool === 'owner') {
    if (!p) { say('Click the player who starts with the ball.'); return; }
    if (t !== 0) { say('Go to 0.00 s to change the starting possession.'); return; }
    setup = setOwner(setup, p.id);
    commit();
    invalidate();
    return;
  }
  if (pending === null) {
    if (!p) { say('Click the player who performs the action.'); return; }
    pending = p.id;
    say(tool === 'move' || tool === 'dribble' ? 'Click the destination.'
      : tool === 'shot' ? 'Click a spot, or the shooter again to shoot at goal.' : 'Click a player or an empty spot.');
    invalidate();
    return;
  }
  const actor = pending;
  const {w, h} = size, n = toNorm(pt, w, h), spot = {x: clamp01(n.x), y: clamp01(n.y)};
  pending = null;
  invalidate();
  if (tool === 'move' || tool === 'dribble') addEv({type: tool, actor, to: spot, t, dur: DUR[tool]});
  else if (tool === 'shot') addEv({type: 'shot', actor, target: p ? (p.id === actor ? 'goal' : p.id) : spot, t, dur: DUR.shot});
  else if (p && p.id === actor) say('Cancelled.');
  else addEv({type: tool, actor, target: p ? p.id : spot, t, dur: DUR[tool]});
}

// --- pointer routing ----------------------------------------------------------
const drag = createDragController({
  getState: () => setup,
  setState: s => { setup = s; invalidate(); },
  getSize: () => size
});
const drawing = createDrawingController({
  getTool: () => tool,
  getSize: () => size,
  onDraft: d => { draft = d; invalidate(); },
  onCommit: data => {
    try { annos = addAnnotation(annos, data); commit(); } catch { say('Could not add that drawing.'); }
    invalidate();
  },
  onTextRequest: p => {
    const text = (window.prompt('Text') || '').trim().slice(0, 200);
    if (!text) return;
    annos = addAnnotation(annos, {type: 'text', pts: [p], text});
    commit();
    invalidate();
  }
});

let active = null;
attachPointer(canvas, {
  down(pt) {
    replay.pause();
    if (DRAW_TOOLS.includes(tool)) { active = drawing; return drawing.down(pt); }
    if (tool === 'drag') {
      if (t !== 0) { say('Go to 0.00 s to move players into the starting setup.'); return false; }
      active = drag;
      return drag.down(pt);
    }
    clickTool(pt);
    return false;
  },
  move: pt => active && active.move(pt),
  up() {
    const was = active;
    active = null;
    was.up();
    if (was === drag) commit();
  }
});

// --- panels -------------------------------------------------------------------
const toolbar = createToolbar(document.getElementById('toolbar'), {
  label: FORMATS[FORMAT].label,
  mode,
  groups: [
    {name: 'Setup', tools: [['drag', 'Move players'], ['owner', 'Possession']]},
    {name: 'Events', tools: [['pass', 'Pass'], ['cross', 'Cross'], ['shot', 'Shot'], ['dribble', 'Dribble'], ['move', 'Run']]},
    {name: 'Draw', tools: [['arrow', 'Arrow'], ['line', 'Line'], ['curve', 'Curve'], ['circle', 'Circle'],
      ['area', 'Area'], ['freehand', 'Freehand'], ['text', 'Text']]}
  ],
  onTool: id => {
    tool = id;
    pending = null;
    drawing.cancel();
    toolbar.setTool(id);
    say(id === 'area' ? 'Click to add points; click the first point or double-click to close.' : `Tool: ${id}`);
    invalidate();
  },
  onMode: m => { mode = m; checkEvents(); },
  onReset: () => {
    if ((events.length || annos.items.length) && !confirm('Discard the current scenario?')) return;
    setup = createSetup(FORMAT);
    events = [];
    annos = createAnnotations();
    selectedId = null;
    commit();
    replay.seek(0);
    invalidate();
  },
  onDeleteEvent: deleteSelected,
  onClearDrawings: () => { annos = clearAnnotations(annos); commit(); invalidate(); },
  onToggleDrawings: v => { hideDrawings = v; invalidate(); }
});
toolbar.setTool(tool);

const timeline = createTimelinePanel(document.getElementById('timeline'), {
  onToggle: () => replay.toggle(),
  onRestart: () => replay.restart(),
  onStep: n => { replay.pause(); replay.step(n); },
  onPrev: () => { const p = prevEventTime(events, t); if (p !== null) replay.seek(p); },
  onNext: () => { const n = nextEventTime(events, t); if (n !== null) replay.seek(n); },
  onSeek: x => { replay.pause(); replay.seek(x); },
  onSpeed: x => { speed = x; replay.setSpeed(x); invalidate(); },
  onSelectEvent: id => {
    selectedId = id;
    replay.seek(events.find(e => e.id === id).t);
    invalidate();
  },
  onUndo: () => apply(history.undo()),
  onRedo: () => apply(history.redo())
});
const analysisPanel = createAnalysisPanel(document.getElementById('analysis'));

window.addEventListener('keydown', e => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
  if (e.key === 'Escape') { pending = null; drawing.cancel(); draft = null; invalidate(); }
  else if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); apply(e.shiftKey ? history.redo() : history.undo()); }
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); apply(history.redo()); }
});
window.addEventListener('resize', invalidate);
say('Drag players to set the starting positions, then pick an event tool.');
render();
