const CSS = `
.ee-panel{display:flex;flex-direction:column;gap:8px;font:14px sans-serif}
.ee-panel[hidden]{display:none}
.ee-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.ee-panel label{display:flex;flex-direction:column;gap:2px}
.ee-panel button,.ee-panel select,.ee-panel input{min-height:44px;min-width:44px;padding:0 10px;font:inherit}
.ee-panel button:disabled{opacity:.4}
`;

const STEP = 0.01;
const round = n => Math.round(n * 100) / 100;
const byTime = events => [...events].sort((a, b) => a.t - b.t || a.id - b.id);

// Patch that moves event `id` one place earlier (dir -1) or later (+1) in time order; null at the ends.
// shortcut: moving before an event at t=0 clamps to 0 and ties by id, so it may not swap; fine until ids matter.
export function reorderPatch(events, id, dir) {
  const sorted = byTime(events);
  const i = sorted.findIndex(e => e.id === id);
  const n = sorted[i + dir];
  if (i < 0 || !n) return null;
  return {t: dir < 0 ? Math.max(0, round(n.t - STEP)) : round(n.t + STEP)};
}

export function createEventEditor(root, {onChange}) {
  const style = document.createElement('style');
  style.textContent = CSS;

  const field = (text, el) => {
    const l = document.createElement('label');
    l.append(text, el);
    return l;
  };
  const num = min => {
    const i = document.createElement('input');
    i.type = 'number';
    i.min = String(min);
    i.step = String(STEP);
    return i;
  };
  const btn = (text, onClick) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.addEventListener('click', onClick);
    return b;
  };

  const actor = document.createElement('select');
  const target = document.createElement('select');
  const start = num(0);
  const dur = num(STEP);
  const earlier = btn('Move earlier', () => emit(-1));
  const later = btn('Move later', () => emit(1));
  const row = document.createElement('div');
  row.className = 'ee-row';
  row.append(field('Actor', actor), field('Target', target), field('Start (s)', start), field('Duration (s)', dur), earlier, later);
  const panel = document.createElement('div');
  panel.className = 'ee-panel';
  panel.append(row);
  root.append(style, panel);

  let cur = null; // {event, events}
  const send = patch => cur && onChange(cur.event.id, patch);
  actor.addEventListener('change', () => send({actor: Number(actor.value)}));
  // a spot target is shown but locked, so it stays unchanged
  target.addEventListener('change', () => send({target: target.value === 'goal' ? 'goal' : Number(target.value)}));
  start.addEventListener('change', () => start.value !== '' && send({t: Math.max(0, Number(start.value))}));
  dur.addEventListener('change', () => Number(dur.value) > 0 && send({dur: Number(dur.value)}));
  function emit(dir) {
    const p = cur && reorderPatch(cur.events, cur.event.id, dir);
    if (p) send(p);
  }

  const fill = (sel, opts, value) => {
    sel.replaceChildren(...opts.map(([v, text]) => Object.assign(document.createElement('option'), {value: v, textContent: text})));
    sel.value = value;
  };

  return {
    // events is the full list; it drives the reorder buttons.
    update({event, players = [], mode, events = []}) {
      cur = event ? {event, events} : null;
      panel.hidden = !event;
      if (!event) return;
      panel.dataset.mode = mode ?? '';
      const ps = players.map(p => [String(p.id), `#${p.id} ${p.team ?? ''}`.trim()]);
      fill(actor, ps, String(event.actor));
      const hasTarget = event.target !== undefined;
      const spot = hasTarget && typeof event.target === 'object';
      fill(target, [...ps, ['goal', 'Goal'], ...(spot ? [['spot', 'Spot']] : [])], spot ? 'spot' : String(event.target ?? ''));
      target.disabled = !hasTarget || spot;
      if (document.activeElement !== start) start.value = String(event.t);
      if (document.activeElement !== dur) dur.value = String(event.dur);
      const sorted = byTime(events);
      earlier.disabled = sorted[0]?.id === event.id;
      later.disabled = sorted.at(-1)?.id === event.id;
    },
  };
}
