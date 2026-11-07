const CSS = `
.tl-panel{display:flex;flex-direction:column;gap:8px;font:14px sans-serif}
.tl-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.tl-panel button,.tl-panel select{min-height:40px;min-width:40px;padding:0 10px;font:inherit}
.tl-panel button:disabled{opacity:.4}
.tl-time{min-width:9em;font-variant-numeric:tabular-nums}
.tl-scrub{flex:1;min-width:120px;min-height:40px;margin:0}
.tl-track{position:relative;height:40px;background:#0002;border-radius:4px}
.tl-marker{position:absolute;top:4px;width:12px;min-width:12px!important;height:32px;min-height:32px!important;
  padding:0!important;margin-left:-6px;border:0;border-radius:3px;background:#2a7de1;cursor:pointer}
.tl-marker.tl-selected{background:#e1802a;outline:2px solid #000}
`;

const SPEEDS = [0.25, 0.5, 1, 1.5, 2];

export function createTimelinePanel(root, h) {
  const style = document.createElement('style');
  style.textContent = CSS;

  const btn = (label, text, onClick) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.setAttribute('aria-label', label);
    b.addEventListener('click', onClick);
    return b;
  };

  const play = btn('Play', 'Play', () => h.onToggle());
  const restart = btn('Restart', 'Restart', () => h.onRestart());
  const stepBack = btn('Step back one frame', '-1f', () => h.onStep(-1));
  const stepFwd = btn('Step forward one frame', '+1f', () => h.onStep(1));
  const prev = btn('Previous event', 'Prev event', () => h.onPrev());
  const next = btn('Next event', 'Next event', () => h.onNext());
  const undo = btn('Undo', 'Undo', () => h.onUndo());
  const redo = btn('Redo', 'Redo', () => h.onRedo());

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

  const scrub = document.createElement('input');
  scrub.type = 'range';
  scrub.className = 'tl-scrub';
  scrub.min = '0';
  scrub.step = '0.01';
  scrub.value = '0';
  scrub.setAttribute('aria-label', 'Replay position');
  scrub.addEventListener('input', () => h.onSeek(Number(scrub.value)));

  const track = document.createElement('div');
  track.className = 'tl-track';

  const controls = document.createElement('div');
  controls.className = 'tl-row';
  controls.append(play, restart, stepBack, stepFwd, prev, next, speed, label, undo, redo);
  const scrubRow = document.createElement('div');
  scrubRow.className = 'tl-row';
  scrubRow.append(scrub);

  const panel = document.createElement('div');
  panel.className = 'tl-panel';
  panel.append(controls, scrubRow, track);
  root.append(style, panel);

  let renderedEvents = null;
  let renderedDuration = null;
  let markers = [];

  function rebuild(events, duration) {
    track.replaceChildren();
    markers = events.map(e => {
      const m = btn(`${e.type} at ${e.t.toFixed(2)} seconds`, '', () => h.onSelectEvent(e.id));
      m.className = 'tl-marker';
      m.title = `${e.type} ${e.t.toFixed(2)}s`;
      m.style.left = `${duration > 0 ? (e.t / duration) * 100 : 0}%`;
      track.append(m);
      return { m, e };
    });
    renderedEvents = events;
    renderedDuration = duration;
  }

  return {
    update({ t, duration, events, playing, selectedId, canUndo, canRedo, speed: sp }) {
      if (events !== renderedEvents || duration !== renderedDuration) rebuild(events, duration);
      for (const { m, e } of markers) {
        m.classList.toggle('tl-selected', e.id === selectedId);
        m.setAttribute('aria-pressed', String(e.id === selectedId));
      }
      play.textContent = playing ? 'Pause' : 'Play';
      play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
      scrub.max = String(duration);
      scrub.value = String(t);
      label.textContent = `${t.toFixed(2)} / ${duration.toFixed(2)} s`;
      undo.disabled = !canUndo;
      redo.disabled = !canRedo;
      if (sp !== undefined && document.activeElement !== speed) speed.value = String(sp);
    },
  };
}
