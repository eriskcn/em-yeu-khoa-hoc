import {createSetup, setOwner, clamp01} from '../core/match-state.js';
import {kickoff} from '../core/scenarios.js';
import {FORMATS} from '../core/match-rules.js';
import {stateAt, duration, isBallEv} from '../core/simulation-engine.js';
import {addEvent, updateEvent, removeEvent} from '../core/event-engine.js';
import {validateEvents} from '../core/action-validator.js';
import {createAnnotations, addAnnotation, clearAnnotations, setHidden, setTimeWindow, removeAnnotation, saveView, applyView, serializeAnnotations, restoreAnnotations} from '../core/annotation-state.js';
import {createReplay} from '../replay/replay-engine.js';
import {nextEventTime, prevEventTime} from '../replay/timeline.js';
import {createHistory} from '../replay/snapshot-manager.js';
import {analyze} from '../analysis/tactical-analyzer.js';
import {possessionShare} from '../analysis/passing-analysis.js';
import {drawPitch, toPx, toNorm, playerRadius, hitRadius, setView} from '../rendering/pitch-renderer.js';
import {drawPlayer} from '../rendering/player-renderer.js';
import {pickPlayer} from '../interaction/pick-player.js';
import {drawBall} from '../rendering/ball-renderer.js';
import {drawAnnotations, drawDraft, drawGhost} from '../rendering/annotation-renderer.js';
import {attachPointer} from '../interaction/pointer-controller.js';
import {createDragController} from '../interaction/drag-controller.js';
import {createDrawingController} from '../interaction/drawing-controller.js';
import {createToolbar} from './toolbar.js';
import {identity, zoomAt, pan} from '../interaction/viewport.js';
import {applyFormation, flipOrientation} from '../core/formations.js';
import {exportScenario, importScenario} from '../core/scenario-io.js';
import {createSetupPanel} from './setup-panel.js';
import {createTimelinePanel} from './timeline-panel.js';
import {createAnalysisPanel} from './analysis-panel.js';
import {createEventEditor} from './event-editor.js';
import {createAnnotationPanel} from './annotation-panel.js';
import {matchFlow} from '../core/match-flow.js';
import {createSelection, toggle, clear, has, moveSelected} from '../interaction/selection.js';
import {createAutosave} from './autosave.js';
import {createContextMenu} from './context-menu.js';

let FORMAT = 7;
const TEAM_COLORS = ['#1e6fd9', '#e03c31'];
let aspect = FORMATS[FORMAT].aspect;
const DUR = {pass: .8, cross: 1.2, shot: .7, dribble: 1, move: 1, save: .4, tackle: .5};
const DRAW_TOOLS = ['arrow', 'line', 'curve', 'circle', 'area', 'freehand', 'text', 'defline', 'press', 'lane'];
const PHASES = {setup: ['drag', 'setup'], sim: ['pass', 'editor'], analysis: ['arrow', 'annotations']};
const FLIGHT = ['pass', 'cross', 'shot'];

const canvas = document.getElementById('pitch');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

let setup = createSetup(FORMAT);
let events = [];
let annos = createAnnotations();
let tool = 'drag', mode = 'simulate';
let t = 0, selectedId = null, pending = null, draft = null, hideDrawings = false, speed = 1;
let size = {w: 0, h: 0};
let view = identity, showGhost = false, phase = 'setup', formationNames = {};
let queued = false;
let sel = createSelection();

const say = msg => { statusEl.textContent = msg; };
const history = createHistory(100);
const snapshot = () => JSON.stringify({setup, events, annotations: serializeAnnotations(annos)});
history.reset(snapshot());

// Report events that the current setup/mode no longer accepts (setup edits can break them).
function checkEvents() {
  const issues = validateEvents(setup, events, mode);
  if (!issues.length) return '';
  const msg = `${issues.length} event issue(s): ${issues[0].message}`;
  say(msg);
  return msg;
}
const toolHint = id => id === 'save' ? 'Click the goalkeeper to save the shot in flight.'
  : id === 'move' ? 'Click a player, then the destination. The time stays, so others can run in the same frame.'
  : id === 'tackle' ? 'Click the tackler, then the player tackled.' : id === 'area' || id === 'press' ? 'Click to add points; click the first point or double-click to close.' : `Tool: ${id}`;
const SAVE_KEY = 'football-replay:scenario';
// localStorage is touched lazily: merely reading it can throw when storage is blocked.
const autosave = createAutosave({setItem: (k, v) => localStorage.setItem(k, v), getItem: k => localStorage.getItem(k)}, SAVE_KEY);
const save = () => autosave.save(exportScenario({setup, events, annotations: annos}));
function commit() { history.push(snapshot()); const m = checkEvents(); save(); return m; }

// matchFlow/possession depend only on setup/events, which are replaced, never mutated.
let cache = {setup: null, events: null};
function derived() {
  if ((active === drag || active === groupDrag) && cache.flow) return cache; // recomputed on the render after pointer up
  if (cache.setup !== setup || cache.events !== events) {
    const d = duration(events);
    cache = {setup, events, flow: matchFlow(setup, events),
      possession: d > 0 ? possessionShare(x => stateAt(setup, events, x), d) : null};
  }
  return cache;
}

function apply(snap, msg) {
  if (!snap) return;
  try {
    const d = JSON.parse(snap);
    if (d.setup.players.length !== setup.players.length) throw new Error('bad setup');
    annos = restoreAnnotations(d.annotations);
    setup = d.setup;
    events = d.events;
    selectedId = null;
    sel = createSelection();
    replay.seek(t);
    say(msg);
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
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const s = stateAt(setup, events, t), r = playerRadius(w);
  drawPitch(ctx, w, h);
  drawFlights(w, h);
  if (showGhost) drawGhost(ctx, w, h, stateAt(setup, events, 0).players, {colors: TEAM_COLORS, radius: r});
  if (!hideDrawings) drawAnnotations(ctx, w, h, annos.items, {t});
  drawDraft(ctx, w, h, draft);
  s.players.forEach(p => {
    const px = toPx(p, w, h);
    drawPlayer(ctx, px, r, TEAM_COLORS[p.team], p.num);
    if (has(sel, p.id)) {
      ctx.beginPath();
      ctx.arc(px.x, px.y, r * 1.45, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (p.id === pending || p.id === s.ball.owner) {
      ctx.beginPath();
      ctx.arc(px.x, px.y, r * 1.45, 0, Math.PI * 2);
      ctx.strokeStyle = p.id === pending ? '#22d3ee' : '#fbbf24';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  });
  const bp = toPx(s.ball, w, h), own = s.ball.owner == null ? null : s.players.find(p => p.id === s.ball.owner);
  // controlled ball sits on the owner's attacking edge so the shirt number stays visible
  if (own) { const q = toPx(own, w, h); bp.x = q.x + (own.team === (setup.flipped ? 1 : 0) ? 1 : -1) * r * 1.2; bp.y = q.y; }
  drawBall(ctx, bp, r);

  timeline.update({t, duration: duration(events), events, playing: replay.isPlaying(), selectedId,
    canUndo: history.canUndo(), canRedo: history.canRedo(), speed});
  setupPanel.update({format: FORMAT, formationNames});
  editor.update({event: events.find(e => e.id === selectedId) || null, players: setup.players, mode, events});
  annoPanel.update({items: annos.items, views: annos.views, t});
  canvas.setAttribute('aria-label', `${FORMATS[FORMAT].label} pitch at ${t.toFixed(2)} s. ${s.ball.owner == null ? `Ball ${s.ball.status ?? 'loose'}` : `Ball with player ${s.players.find(p => p.id === s.ball.owner).num}`}.`);
  const {flow: f, possession} = derived();
  flowEl.textContent = `Score ${f.score[0]}–${f.score[1]}` + (f.restarts.length
    ? ` · ${f.restarts.map(r => `${r.kind} (team ${r.team + 1}) @${r.t.toFixed(2)}s`).join(', ')}` : '');
  const a = analyze({state: s, events, aspect, t});
  a.approximate.possession = possession;
  analysisPanel.update(a);
}

// --- events -----------------------------------------------------------------
function playerAt(pt) {
  const {w, h} = size, r = hitRadius(w);
  const st = stateAt(setup, events, t).players;
  const hits = [...st].reverse().filter(p => {
    const q = toPx(p, w, h);
    return Math.hypot(pt.x - q.x, pt.y - q.y) < r;
  });
  return pickPlayer(hits, tool, pending == null ? null : st.find(p => p.id === pending)?.team);
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
  const issue = commit(), warn = res.issues.length ? `Warning: ${res.issues[0].message}` : issue;
  const num = id => stateAt(setup, events, 0).players.find(p => p.id === id)?.num ?? id;
  const tgt = ev.target === undefined ? '' : ` -> ${typeof ev.target === 'object' ? 'spot' : ev.target === 'goal' ? 'goal' : num(ev.target)}`;
  const who = ev.type === 'phase' ? ev.kind : `${ev.type[0].toUpperCase() + ev.type.slice(1)} ${num(ev.actor ?? ev.off)}${tgt}`;
  say(`${who[0].toUpperCase() + who.slice(1)} added at ${ev.t.toFixed(2)} s` + (warn ? `. ${warn}` : ''));
  // Ball actions chain, so move to where this one ends; runs and subs keep the time so more can start in the same frame.
  replay.seek(isBallEv(ev) ? ev.t + ev.dur : ev.t);
}

function deleteSelected() {
  if (selectedId === null) { say('Select an event marker on the timeline first.'); return; }
  events = removeEvent(events, selectedId);
  selectedId = null;
  sel = createSelection();
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
  if (tool === 'save') {
    if (!p) { say('Click the goalkeeper.'); return; }
    addEv({type: 'save', actor: p.id, t, dur: DUR.save});
    return;
  }
  if (tool === 'sub') {
    if (!p) { say('Click the player to substitute off.'); return; }
    const top = Math.max(setup.players.length / 2, ...events.filter(e => e.type === 'sub' && e.team === p.team).map(e => Number(e.on) || 0));
    addEv({type: 'sub', team: p.team, off: p.id, on: String(top + 1), t, dur: 0});
    return;
  }
  if (pending === null) {
    if (!p) { say('Click the player who performs the action.'); return; }
    pending = p.id;
    say(tool === 'move' || tool === 'dribble' ? 'Click the destination.'
      : tool === 'tackle' ? 'Click the player being tackled.'
      : tool === 'shot' ? 'Click a spot, or the shooter again to shoot at goal.' : 'Click a player or an empty spot.');
    invalidate();
    return;
  }
  if (tool === 'tackle' && !p) { say('Click the player being tackled.'); return; }
  const actor = pending;
  const {w, h} = size, n = toNorm(pt, w, h), spot = {x: clamp01(n.x), y: clamp01(n.y)};
  pending = null;
  invalidate();
  if (tool === 'move' || tool === 'dribble') addEv({type: tool, actor, to: spot, t, dur: DUR[tool]});
  else if (tool === 'shot') addEv({type: 'shot', actor, target: p ? (p.id === actor ? 'goal' : p.id) : spot, t, dur: DUR.shot});
  else if (p && p.id === actor) say('Cancelled.');
  else if (tool === 'tackle') addEv({type: 'tackle', actor, target: p.id, won: true, t, dur: DUR.tackle});
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
    try { annos = addAnnotation(annos, data); commit(); say('Drawing added'); } catch { say('Could not add that drawing.'); }
    invalidate();
  },
  onTextRequest: p => {
    const text = (window.prompt('Text') || '').trim().slice(0, 200);
    if (!text) return;
    annos = addAnnotation(annos, {type: 'text', pts: [p], text});
    commit();
    say('Drawing added');
    invalidate();
  }
});

let active = null;
let groupFrom = null;
// Dragging a selected player moves every selected player by the same offset.
const groupDrag = {
  move(pt) {
    const n = toNorm(pt, size.w, size.h);
    setup = moveSelected(setup, sel.ids, n.x - groupFrom.x, n.y - groupFrom.y);
    groupFrom = n;
    invalidate();
  },
  up() { groupFrom = null; }
};
const menu = createContextMenu(document.body, {
  onPick: ({id, player}) => {
    if (id === 'toggle') sel = toggle(sel, player.id);
    else if (id === 'clear') sel = clear(sel);
    else if (id === 'owner') { setup = setOwner(setup, player.id); commit(); }
    invalidate();
  }
});
canvas.addEventListener('contextmenu', e => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect(), p = playerAt({x: e.clientX - r.left, y: e.clientY - r.top});
  if (!p) return;
  const pick = id => ({id, player: p});
  menu.show(e.clientX, e.clientY, [
    {id: pick('toggle'), label: `${has(sel, p.id) ? 'Deselect' : 'Select'} #${p.num}`},
    {id: pick('owner'), label: 'Give ball', disabled: t !== 0},
    {id: pick('clear'), label: 'Clear selection', disabled: sel.ids.size === 0}
  ]);
});
attachPointer(canvas, {
  down(pt) {
    replay.pause();
    if (DRAW_TOOLS.includes(tool)) { active = drawing; return drawing.down(pt); }
    if (tool === 'drag') {
      if (t !== 0) { say('Go to 0.00 s to move players into the starting setup.'); return false; }
      const hit = playerAt(pt);
      if (hit && sel.ids.size > 1 && has(sel, hit.id)) { groupFrom = toNorm(pt, size.w, size.h); active = groupDrag; return true; }
      active = drag;
      return drag.down(pt);
    }
    clickTool(pt);
    return false;
  },
  move: pt => active && active.move(pt),
  pinch: (f, cx, cy) => { view = zoomAt(view, f, cx, cy, size.w, size.h); setView(view); invalidate(); },
  panBy: (dx, dy) => { view = pan(view, dx, dy, size.w, size.h); setView(view); invalidate(); },
  up() {
    const was = active;
    active = null;
    if (!was) return; // a second finger already cancelled the drag
    was.up();
    if (was === drag || was === groupDrag) { commit(); invalidate(); }
  }
});

// --- panels -------------------------------------------------------------------
const toolbar = createToolbar(document.getElementById('toolbar'), {
  headerRoot: document.querySelector('header'),
  formats: Object.entries(FORMATS).map(([k, f]) => [k, f.label]),
  format: FORMAT,
  phases: [['setup', '1 Setup'], ['sim', '2 Simulation'], ['analysis', '3 Analysis']],
  phase,
  mode,
  groups: [
    {name: 'Setup', phase: 'setup', tools: [['drag', 'Move players'], ['owner', 'Possession']]},
    {name: 'Events', phase: 'sim', tools: [['pass', 'Pass'], ['cross', 'Cross'], ['shot', 'Shot'], ['dribble', 'Dribble'], ['move', 'Run'], ['tackle', 'Tackle'], ['save', 'Save'], ['sub', 'Substitute'],
      ['half-time', 'Half-time'], ['full-time', 'Full-time']]},
    {name: 'Draw', phase: 'analysis', tools: [['arrow', 'Arrow'], ['line', 'Line'], ['curve', 'Curve'], ['circle', 'Circle'],
      ['area', 'Area'], ['freehand', 'Freehand'], ['text', 'Text'],
      ['defline', 'Def. line'], ['press', 'Press zone'], ['lane', 'Lane']]}
  ],
  onTool: id => {
    if (id === 'half-time' || id === 'full-time') { addEv({type: 'phase', kind: id, t, dur: 0}); return; }
    tool = id;
    pending = null;
    drawing.cancel();
    toolbar.setTool(id);
    say(toolHint(id));
    invalidate();
  },
  onFormat: f => {
    if (f === FORMAT) return FORMAT;
    if ((events.length || annos.items.length) && !confirm('Switching format discards the current scenario. Continue?')) return FORMAT;
    FORMAT = f;
    aspect = FORMATS[f].aspect;
    setup = createSetup(f);
    events = [];
    annos = createAnnotations();
    selectedId = null;
    sel = createSelection();
    history.reset(snapshot());
    save();
    replay.seek(0);
    say(`Format: ${FORMATS[f].label}`);
    invalidate();
    return FORMAT;
  },
  onMode: m => { mode = m; checkEvents(); },
  onReset: () => {
    if ((events.length || annos.items.length) && !confirm('Discard the current scenario?')) return;
    setup = createSetup(FORMAT);
    events = [];
    annos = createAnnotations();
    selectedId = null;
    sel = createSelection();
    commit();
    replay.seek(0);
    invalidate();
  },
  onKickoff: () => {
    if ((events.length || annos.items.length) && !confirm('Replace the current scenario with a kick-off?')) return;
    ({setup, events} = kickoff(FORMAT, !!setup.flipped));
    annos = createAnnotations();
    selectedId = null;
    sel = createSelection();
    commit();
    replay.seek(0);
    invalidate();
  },
  onDeleteEvent: deleteSelected,
  onClearDrawings: () => { annos = clearAnnotations(annos); commit(); invalidate(); },
  onToggleDrawings: v => { hideDrawings = v; invalidate(); },
  onToggleGhost: v => { showGhost = v; invalidate(); },
  onResetView: () => { view = identity; setView(view); invalidate(); },
  onExport: () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([exportScenario({setup, events, annotations: annos})], {type: 'application/json'}));
    a.download = 'scenario.json';
    a.click();
    URL.revokeObjectURL(a.href);
  },
  onImport: text => {
    if ((events.length || annos.items.length) && !confirm('Replace the current scenario with the imported one?')) return;
    try {
      const r = importScenario(text);
      FORMAT = r.setup.format;
      aspect = FORMATS[FORMAT].aspect;
      setup = r.setup;
      events = r.events;
      annos = r.annotations;
      selectedId = null;
      sel = createSelection();
      formationNames = {};
      toolbar.setFormat(FORMAT);
      history.reset(snapshot());
      save();
      replay.seek(0);
      const issues = validateEvents(setup, events, mode);
      say(r.warnings.length ? `Imported with ${r.warnings.length} warning(s): ${r.warnings[0]}`
        : issues.length ? `Imported; ${issues.length} event issue(s): ${issues[0].message}` : 'Imported.');
    } catch (e) { say(`Import failed: ${e.message}`); }
    invalidate();
  },
  onPhase: id => setPhase(id)
});
toolbar.setTool(tool);
const setPhase = id => {
  phase = id;
  toolbar.setPhase(id);
  PHASES_ALL.forEach(([ph, el]) => { el.hidden = ph !== id; });
  toolbar.setTool(PHASES[id][0]);
  tool = PHASES[id][0];
  say(toolHint(tool));
  pending = null;
  drawing.cancel();
  invalidate();
};

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
  onUndo: () => apply(history.undo(), 'Undone'),
  onRedo: () => apply(history.redo(), 'Redone')
});
const analysisPanel = createAnalysisPanel(document.getElementById('analysis'));
const setupPanel = createSetupPanel(document.getElementById('setup'), {
  onChange: i => {
    if (i.kind === 'flip') {
      if (t !== 0 || events.length) { say('Go to 0.00 s and clear all events before flipping sides.'); return; }
      setup = flipOrientation(setup);
      commit();
      say('Sides flipped.');
      invalidate();
      return;
    }
    if (t !== 0) { say('Go to 0.00 s to change formations.'); return; }
    setup = applyFormation(setup, i.team, i.name);
    formationNames = {...formationNames, [i.team]: i.name};
    commit();
    invalidate();
  }
});
const PHASES_ALL = [['setup', document.getElementById('setup')], ['sim', document.getElementById('editor')], ['sim', document.getElementById('flow')],
  ['analysis', document.getElementById('annotations')], ['analysis', document.getElementById('analysis')]];
const flowEl = document.getElementById('flow');
const editor = createEventEditor(document.getElementById('editor'), {
  onChange: (id, patch) => {
    const res = updateEvent(events, id, patch, mode, setup);
    if (res.events === events) say(res.issues.filter(i => i.level === 'rejected').map(i => i.message).join('; ') || 'Edit rejected.');
    else { events = res.events; commit(); }
    invalidate();
  }
});
const annoPanel = createAnnotationPanel(document.getElementById('annotations'), {
  onChange: i => {
    try {
      if (i.kind === 'toggle') annos = setHidden(annos, i.id, i.hidden);
      else if (i.kind === 'window') annos = setTimeWindow(annos, i.id, i.from, i.to);
      else if (i.kind === 'delete') annos = removeAnnotation(annos, i.id);
      else if (i.kind === 'saveView') annos = saveView(annos, i.name, i.t);
      else if (i.kind === 'applyView') { annos = applyView(annos, i.name); if (i.t !== null) replay.seek(i.t); }
      commit();
    } catch (e) { say(e.message); }
    invalidate();
  }
});

window.addEventListener('keydown', e => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
  if (e.key === 'Escape') { pending = null; drawing.cancel(); draft = null; invalidate(); }
  else if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); apply(e.shiftKey ? history.redo() : history.undo(), e.shiftKey ? 'Redone' : 'Undone'); }
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); apply(history.redo(), 'Redone'); }
});
window.addEventListener('resize', invalidate);
const propsBtn = document.getElementById('btn-props');
propsBtn.addEventListener('click', () => propsBtn.setAttribute('aria-expanded', String(document.body.classList.toggle('props-open'))));
setPhase('setup');
say('Drag players to set the starting positions, then pick an event tool.');
try {
  const saved = autosave.load();
  if (saved) {
    const r = importScenario(saved);
    FORMAT = r.setup.format;
    aspect = FORMATS[FORMAT].aspect;
    setup = r.setup;
    events = r.events;
    annos = r.annotations;
    toolbar.setFormat(FORMAT);
    history.reset(snapshot());
  }
} catch { /* no or invalid saved scenario: keep the default */ }
render();
