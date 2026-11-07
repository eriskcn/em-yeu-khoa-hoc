// Format label, Edit/Simulate switch, tool groups and a few actions. No state of its own.
export function createToolbar(root, {label, groups, mode, onTool, onMode, onReset, onKickoff, onDeleteEvent, onClearDrawings, onToggleDrawings}) {
  const el = (tag, parent, text, cls) => {
    const e = document.createElement(tag);
    if (text) e.textContent = text;
    if (cls) e.className = cls;
    parent.append(e);
    return e;
  };
  const row = el('div', root, null, 'tb-row');
  el('span', row, label, 'format');
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
  const hide = el('label', row, 'Hide drawings');
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.addEventListener('change', () => onToggleDrawings(cb.checked));
  hide.prepend(cb);

  const buttons = {};
  const tools = el('div', root, null, 'tb-row');
  groups.forEach(g => {
    el('span', tools, g.name, 'tb-group');
    g.tools.forEach(([id, text]) => {
      const b = el('button', tools, text, 'tool');
      b.type = 'button';
      b.addEventListener('click', () => onTool(id));
      buttons[id] = b;
    });
  });
  return {setTool: id => Object.entries(buttons).forEach(([k, b]) => b.classList.toggle('on', k === id))};
}
