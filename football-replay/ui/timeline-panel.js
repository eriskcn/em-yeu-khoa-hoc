import {icon, setIcon} from './icons.js';
import {playerLabel} from './event-editor.js';
import {STEP, timeToPx, pxToTime, snap, snapStep, fitView, clampView, zoomAbout, layers} from './timeline-scale.js';

const LABEL_W = 64;
const LANE_H = 22;
const COLORS = {pass: '#2a7de1', cross: '#7c5ce0', shot: '#e14a4a', dribble: '#d9a21b', move: '#2f9e6b', tackle: '#c2410c',
  save: '#0e9fb3', receive: '#8a8f98', sub: '#e879a8', phase: '#f5f5f5'};
const TICKS = [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60];

const CSS = `
.tl-panel{display:flex;flex-direction:column;gap:8px;font:14px sans-serif}
.tl-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.tl-panel button,.tl-panel select{min-height:44px;min-width:44px;padding:0 10px;font:inherit}
.tl-panel button:disabled{opacity:.4}
.tl-panel .lbl{display:none}
.tl-time{min-width:9em;font-variant-numeric:tabular-nums}
.tl-track{position:relative;max-height:min(30dvh,170px);overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;
  background:#0002;border-radius:4px;user-select:none;-webkit-user-select:none}
.tl-inner{position:relative;min-width:100%}
.tl-ruler,.tl-r{display:flex}
.tl-ruler{position:sticky;top:0;z-index:3;height:22px;background:#2b2b2b;touch-action:none;cursor:col-resize}
.tl-l{flex:none;width:${LABEL_W}px;box-sizing:border-box;padding:0 4px;font-size:11px;line-height:${LANE_H + 4}px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:#232323;border-bottom:1px solid #0004;touch-action:pan-y}
.tl-ruler .tl-l{line-height:22px}
.tl-lane{position:relative;flex:1;min-width:0;overflow:hidden;touch-action:none;border-bottom:1px solid #0004}
.tl-tick{position:absolute;top:0;bottom:0;border-left:1px solid #888;padding-left:3px;font-size:10px;line-height:22px;color:#ccc;pointer-events:none}
.tl-ph{position:absolute;top:0;bottom:0;width:0;z-index:4;pointer-events:none}
.tl-ph::before{content:"";position:absolute;top:0;bottom:0;left:-1px;width:2px;background:#f43f5e}
.tl-hd{position:absolute;top:0;left:-7px;width:14px;height:16px;background:#f43f5e;border-radius:3px 3px 8px 8px;
  pointer-events:auto;touch-action:none;cursor:ew-resize}
.tl-panel .tl-bar{position:absolute;box-sizing:border-box;height:${LANE_H}px;min-height:0!important;min-width:0!important;padding:0!important;border:1px solid #0006;
  border-radius:4px;color:#fff;font-size:11px;display:flex;align-items:center;overflow:hidden;touch-action:none;cursor:grab;white-space:nowrap}
.tl-bar .tl-c{display:flex;align-items:center;gap:3px;padding:0 6px;pointer-events:none}
.tl-bar .ic{width:14px;height:14px}
.tl-bar.tl-dia{border:0;border-radius:0;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%)}
.tl-bar.tl-selected{outline:2px solid #fff;outline-offset:-1px;z-index:2}
.tl-bar:focus-visible{outline:2px solid #22d3ee;outline-offset:1px;z-index:2}
.tl-e{position:absolute;top:0;bottom:0;width:9px;cursor:ew-resize;touch-action:none}
.tl-e[data-edge=l]{left:0}.tl-e[data-edge=r]{right:0}
`;

const SPEEDS = [0.25, 0.5, 1, 1.5, 2];

export function createTimelinePanel(root, h) {
  const style = document.createElement('style');
  style.textContent = CSS;

  const btn = (label, icon, onClick) => {
    const b = document.createElement('button');
    b.type = 'button';
    setIcon(b, icon, label);
    b.addEventListener('click', onClick);
    return b;
  };

  const play = btn('Play', 'play', () => h.onToggle());
  const restart = btn('Restart', 'restart', () => h.onRestart());
  const stepBack = btn('Step back one frame', 'stepBack', () => h.onStep(-1));
  const stepFwd = btn('Step forward one frame', 'stepFwd', () => h.onStep(1));
  const prev = btn('Previous event', 'prev', () => h.onPrev());
  const next = btn('Next event', 'next', () => h.onNext());
  const undo = btn('Undo', 'undo', () => h.onUndo());
  const redo = btn('Redo', 'redo', () => h.onRedo());

  const speed = document.createElement('select');
  speed.setAttribute('aria-label', 'Playback speed');
  for (const s of SPEEDS) {
    const o = document.createElement('option');
    o.value = String(s);
    o.textContent = `${s}x`;
    speed.append(o);
  }
  speed.value = '1';
  speed.addEventListener('change', () => h.onSpeed(Number(speed.value)));

  const label = document.createElement('span');
  label.className = 'tl-time';
  label.setAttribute('aria-live', 'polite');

  const fitBtn = btn('Fit timeline', 'zoom', () => { fit = true; relayout(); });

  const track = document.createElement('div');
  track.className = 'tl-track';
  const inner = document.createElement('div');
  inner.className = 'tl-inner';
  const ruler = document.createElement('div');
  ruler.className = 'tl-ruler';
  const rulerLane = document.createElement('div');
  rulerLane.className = 'tl-lane';
  rulerLane.style.border = '0';
  const corner = document.createElement('div');
  corner.className = 'tl-l';
  corner.textContent = 'Time';
  ruler.append(corner, rulerLane);
  const rowsEl = document.createElement('div');
  const head = document.createElement('div');
  head.className = 'tl-ph';
  const handle = document.createElement('div');
  handle.className = 'tl-hd';
  head.append(handle);
  inner.append(ruler, rowsEl, head);
  track.append(inner);

  const controls = document.createElement('div');
  controls.className = 'tl-row';
  controls.append(play, restart, stepBack, stepFwd, prev, next, speed, label, undo, redo, fitBtn);

  const panel = document.createElement('div');
  panel.className = 'tl-panel';
  panel.append(controls, track);
  root.append(style, panel);

  let renderedEvents = null, renderedDuration = null, renderedPlayers = null;
  let bars = [];
  let view = {t0: 0, pps: 1}, fit = true, width = 0;
  let curT = 0, curDuration = 0;
  const laneW = () => track.clientWidth - LABEL_W;

  function place(b, t = b.e.t, dur = b.e.dur || 0) {
    const w = timeToPx(t + dur, view) - timeToPx(t, view);
    const dia = !(dur > 0);
    b.el.style.left = `${timeToPx(t, view) - (dia ? 7 : 0)}px`;
    b.el.style.width = `${dia ? 14 : Math.max(w, 6)}px`;
    const key = `${w >= 28}${w >= 70}`;
    if (!dia && b.ck !== key) {
      b.ck = key;
      b.c.innerHTML = (w >= 28 ? icon(b.e.type) : '') + (w >= 70 ? b.e.type : '');
    }
  }

  const placeHead = () => { head.style.left = `${LABEL_W + timeToPx(curT, view)}px`; };

  function drawRuler() {
    const step = TICKS.find(s => s * view.pps >= 60) ?? 60;
    const ticks = [];
    for (let k = Math.ceil(view.t0 / step); k * step <= view.t0 + width / view.pps; k++) {
      const tk = document.createElement('div');
      tk.className = 'tl-tick';
      tk.style.left = `${timeToPx(k * step, view)}px`;
      tk.textContent = `${Number((k * step).toFixed(2))}s`;
      ticks.push(tk);
    }
    rulerLane.replaceChildren(...ticks);
  }

  function relayout() {
    width = laneW();
    if (width <= 0) return; // panel hidden (collapsed track)
    view = fit ? fitView(curDuration, width) : clampView(view, curDuration, width);
    bars.forEach(b => place(b));
    drawRuler();
    placeHead();
  }

  function rebuild(events, players) {
    const focusId = document.activeElement?.dataset?.id;
    rowsEl.replaceChildren();
    bars = [];
    for (const r of layers(events, players)) {
      const row = document.createElement('div');
      row.className = 'tl-r';
      const lab = document.createElement('div');
      lab.className = 'tl-l';
      lab.textContent = r.key === 'sub' ? 'Subs' : r.key === 'match' ? 'Match' : playerLabel(players.find(q => `p${q.id}` === r.key));
      lab.title = lab.textContent;
      const lane = document.createElement('div');
      lane.className = 'tl-lane';
      lane.style.height = `${r.lanes * LANE_H + 4}px`;
      r.events.forEach((e, i) => {
        const el = document.createElement('button');
        el.type = 'button';
        el.dataset.id = String(e.id);
        const dia = !(e.dur > 0);
        el.className = `tl-bar${dia ? ' tl-dia' : ''}`;
        el.style.background = COLORS[e.type] || '#888';
        el.style.top = `${2 + r.laneOf[i] * LANE_H}px`;
        el.title = `${e.type} ${e.t.toFixed(2)}s`;
        el.setAttribute('aria-label', `${e.type} ${lab.textContent} at ${e.t.toFixed(2)}s`);
        const c = document.createElement('span');
        c.className = 'tl-c';
        el.append(c);
        if (!dia) for (const edge of ['l', 'r']) {
          const g = document.createElement('span');
          g.className = 'tl-e';
          g.dataset.edge = edge;
          el.append(g);
        }
        lane.append(el);
        bars.push({el, e, c, ck: ''});
      });
      row.append(lab, lane);
      rowsEl.append(row);
    }
    renderedEvents = events;
    renderedPlayers = players;
    relayout();
    if (focusId) bars.find(b => b.el.dataset.id === focusId)?.el.focus(); // keyboard nudges rebuild the DOM
  }

  // Pointer interaction: bars (move/resize), ruler + playhead (scrub), empty lane (pan), two fingers (pinch).
  const pointers = new Map();
  let drag = null, pinch = null;
  const laneX = cx => cx - track.getBoundingClientRect().left - LABEL_W;
  const dist = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
  const midX = () => { const [a, b] = [...pointers.values()]; return laneX((a.x + b.x) / 2); };
  const setView = v => { view = v; fit = false; relayout(); };
  const scrubTo = cx => h.onSeek(Math.min(curDuration, Math.max(0, pxToTime(laneX(cx), view))));

  track.addEventListener('pointerdown', ev => {
    pointers.set(ev.pointerId, {x: ev.clientX, y: ev.clientY});
    track.setPointerCapture(ev.pointerId);
    if (pointers.size === 2) { drag = null; pinch = {d: dist(), view, mid: midX()}; return; }
    if (pointers.size > 2 || width <= 0) return;
    const bar = ev.target.closest('.tl-bar');
    if (bar) {
      drag = {kind: ev.target.dataset?.edge || 'move', b: bars.find(x => x.el === bar), x0: ev.clientX, moved: false};
    } else if (ev.target.closest('.tl-ruler') || ev.target.closest('.tl-hd')) {
      drag = {kind: 'scrub'};
      scrubTo(ev.clientX);
    } else if (ev.target.closest('.tl-lane')) {
      drag = {kind: 'pan', x0: ev.clientX, y0: ev.clientY, view, top: track.scrollTop};
    }
  });

  // Patch the bar drag would produce at pointer x.
  function proposal(d, cx) {
    const {e} = d.b, st = snapStep(view.pps), dt = (cx - d.x0) / view.pps, end = e.t + (e.dur || 0);
    if (d.kind === 'move') return {t: Math.max(0, snap(e.t + dt, st))};
    if (d.kind === 'l') {
      const t = Math.min(Math.max(0, snap(e.t + dt, st)), Math.max(0, end - STEP));
      return {t, dur: Number((end - t).toFixed(4))};
    }
    return {dur: Math.max(STEP, Number((snap(end + dt, st) - e.t).toFixed(4)))};
  }

  track.addEventListener('pointermove', ev => {
    if (!pointers.has(ev.pointerId)) return;
    pointers.set(ev.pointerId, {x: ev.clientX, y: ev.clientY});
    if (pinch) { setView(zoomAbout(pinch.view, dist() / pinch.d, pinch.mid, curDuration, width)); return; }
    if (!drag) return;
    if (drag.kind === 'scrub') scrubTo(ev.clientX);
    else if (drag.kind === 'pan') {
      setView({...drag.view, t0: drag.view.t0 - (ev.clientX - drag.x0) / drag.view.pps});
      track.scrollTop = drag.top - (ev.clientY - drag.y0);
    } else {
      if (!drag.moved && Math.abs(ev.clientX - drag.x0) < 3) return;
      drag.moved = true;
      const p = proposal(drag, ev.clientX);
      place(drag.b, p.t ?? drag.b.e.t, p.dur ?? drag.b.e.dur);
    }
  });

  const end = ev => {
    pointers.delete(ev.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size || !drag) return;
    const d = drag;
    drag = null;
    if (!d.b) return;
    if (ev.type !== 'pointerup') { place(d.b); return; }
    if (!d.moved) { h.onSelectEvent(d.b.e.id); return; }
    const p = proposal(d, ev.clientX);
    if (p.t === d.b.e.t) delete p.t;
    if (p.dur === (d.b.e.dur || 0)) delete p.dur;
    if (Object.keys(p).length) h.onUpdateEvent(d.b.e.id, p);
    place(d.b); // snaps back when rejected; an accepted edit rebuilds from the new events
  };
  track.addEventListener('pointerup', end);
  track.addEventListener('pointercancel', end);

  track.addEventListener('wheel', ev => {
    if (width <= 0) return;
    if (ev.ctrlKey || ev.metaKey) {
      ev.preventDefault();
      setView(zoomAbout(view, Math.exp(-ev.deltaY * 0.002), laneX(ev.clientX), curDuration, width));
    } else if (ev.shiftKey || Math.abs(ev.deltaX) > Math.abs(ev.deltaY) || track.scrollHeight <= track.clientHeight) {
      ev.preventDefault(); // plain wheel only pans when there is nothing to scroll vertically
      setView({...view, t0: view.t0 + (ev.deltaX || ev.deltaY) / view.pps});
    }
  }, {passive: false});

  // A click with detail 0 is the keyboard (Enter/Space); mouse and touch select on pointerup.
  track.addEventListener('click', ev => {
    const bar = ev.target.closest('.tl-bar');
    if (bar && ev.detail === 0) h.onSelectEvent(Number(bar.dataset.id));
  });
  track.addEventListener('keydown', ev => {
    const bar = ev.target.closest('.tl-bar');
    if (!bar || (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight')) return;
    ev.preventDefault();
    const e = bars.find(x => x.el === bar).e;
    const t = Math.max(0, snap(e.t + (ev.key === 'ArrowLeft' ? -1 : 1) * (ev.shiftKey ? 0.5 : STEP)));
    if (t !== e.t) h.onUpdateEvent(e.id, {t});
  });

  return {
    update({ t, duration, events, playing, selectedId, canUndo, canRedo, speed: sp, setup }) {
      const players = setup?.players ?? [];
      curT = t;
      curDuration = duration;
      if (events !== renderedEvents || players !== renderedPlayers) rebuild(events, players);
      else if (duration !== renderedDuration || laneW() !== width) relayout();
      else placeHead();
      renderedDuration = duration;
      for (const { el, e } of bars) {
        el.classList.toggle('tl-selected', e.id === selectedId);
        el.setAttribute('aria-pressed', String(e.id === selectedId));
      }
      if (play.dataset.playing !== String(playing)) {
        play.dataset.playing = String(playing);
        setIcon(play, playing ? 'pause' : 'play', playing ? 'Pause' : 'Play');
      }
      label.textContent = `${t.toFixed(2)} / ${duration.toFixed(2)} s`;
      undo.disabled = !canUndo;
      redo.disabled = !canRedo;
      if (sp !== undefined && document.activeElement !== speed) speed.value = String(sp);
    },
  };
}
