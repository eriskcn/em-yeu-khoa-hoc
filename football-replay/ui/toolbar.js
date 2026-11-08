// Format label, Edit/Simulate switch, tool groups and a few actions. No state of its own.
export function createToolbar(root, {formats, format, groups, mode, onTool, onMode, onFormat, onReset, onKickoff, onDeleteEvent, onClearDrawings, onToggleDrawings, onToggleGhost, onResetView, onExport, onImport, onPhase, phases, phase, headerRoot}) {
  const el = (tag, parent, text, cls) => {
    const e = document.createElement(tag);
    if (text) e.textContent = text;
    if (cls) e.className = cls;
    parent.append(e);
    return e;
  };
  const menu = el('details', headerRoot, null, 'tb-menu-wrap');
  el('summary', menu, 'Menu');
  const row = el('div', menu, null, 'tb-menu');
  const fsel = el('select', row, null, 'format');
  fsel.setAttribute('aria-label', 'Match format');
  formats.forEach(([v, t]) => { el('option', fsel, t).value = v; });
  fsel.value = format;
  fsel.addEventListener('change', () => { fsel.value = onFormat(Number(fsel.value)); });
  const sel = el('select', row);
  sel.setAttribute('aria-label', 'Rule mode');
  [['simulate', 'Simulate (rules enforced)'], ['edit', 'Edit (free)']].forEach(([v, t]) => { el('option', sel, t).value = v; });
  sel.value = mode;
  sel.addEventListener('change', () => onMode(sel.value));
  const act = (text, fn) => el('button', row, text).addEventListener('click', fn);
  act('Reset', onReset);
  act('Kick-off', onKickoff);
  act('Delete event', onDeleteEvent);
  act('Clear drawings', onClearDrawings);
  act('Reset zoom', onResetView);
  act('Export', onExport);
  const file = el('input', row);
  file.type = 'file';
  file.accept = '.json,application/json';
  file.hidden = true;
  file.addEventListener('change', async () => { if (file.files[0]) onImport(await file.files[0].text()); file.value = ''; });
  act('Import', () => file.click());
  const hide = el('label', row, 'Hide drawings');
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.addEventListener('change', () => onToggleDrawings(cb.checked));
  hide.prepend(cb);
  const ghost = el('label', row, 'Show setup ghost');
  const gb = document.createElement('input');
  gb.type = 'checkbox';
  gb.addEventListener('change', () => onToggleGhost(gb.checked));
  ghost.prepend(gb);

  const buttons = {};
  const phaseRow = el('div', headerRoot, null, 'tb-phases');
  el('span', phaseRow, 'Phase', 'tb-group');
  const phaseBtns = phases.map(([id, text]) => {
    const b = el('button', phaseRow, text);
    b.type = 'button';
    b.addEventListener('click', () => onPhase(id));
    return [id, b];
  });
  const tools = el('div', root, null, 'tb-tools');
  const wraps = [];
  groups.forEach(g => {
    const wrap = el('span', tools, null, 'tb-wrap');
    wraps.push([g.phase, wrap]);
    el('span', wrap, g.name, 'tb-group');
    g.tools.forEach(([id, text]) => {
      const b = el('button', wrap, text, 'tool');
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => onTool(id));
      buttons[id] = b;
    });
  });
  const setPhase = id => {
    wraps.forEach(([ph, w]) => { w.hidden = ph !== id; });
    phaseBtns.forEach(([k, b]) => b.setAttribute('aria-pressed', String(k === id)));
  };
  setPhase(phase);
  return {
    setPhase,
    setFormat: f => { fsel.value = f; },
    setTool: id => Object.entries(buttons).forEach(([k, b]) => { b.classList.toggle('on', k === id); b.setAttribute('aria-pressed', String(k === id)); })};
}
