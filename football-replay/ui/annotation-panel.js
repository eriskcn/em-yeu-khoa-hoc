const CSS = `
.ap-panel{display:flex;flex-direction:column;gap:8px;font:14px sans-serif}
.ap-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.ap-panel button,.ap-panel input{min-height:44px;min-width:44px;padding:0 8px;font:inherit}
.ap-panel input[type=number]{width:5.5em}
.ap-panel input[type=text]{flex:1;min-width:8em}
.ap-item{border-bottom:1px solid #0002;padding-bottom:6px}
`;

const el = (tag, props = {}, ...kids) => {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...kids);
  return e;
};

// items: annotation-state items; views: [{name, t, hiddenIds}]; t: current replay time.
export function createAnnotationPanel(root, {onChange}) {
  const list = el('div');
  const viewRow = el('div', {className: 'ap-row'});
  root.append(el('style', {textContent: CSS}), el('div', {className: 'ap-panel'}, list, viewRow));

  const btn = (label, text, onClick) => {
    const b = el('button', {type: 'button', textContent: text});
    b.setAttribute('aria-label', label);
    b.addEventListener('click', onClick);
    return b;
  };
  const num = (label, v) => {
    const i = el('input', {type: 'number', step: '0.1', min: '0', placeholder: 'any', value: v === null ? '' : String(v)});
    i.setAttribute('aria-label', label);
    return i;
  };
  const parse = i => i.value === '' ? null : Number(i.value);

  let sig = '';
  let cur = {items: [], views: [], t: 0};

  function build() {
    list.replaceChildren(...cur.items.map(a => {
      const name = `${a.type} ${a.id}`;
      const from = num(`${name} start seconds`, a.from);
      const to = num(`${name} end seconds`, a.to);
      const apply = () => {
        const f = parse(from), e = parse(to);
        if (Number.isNaN(f) || Number.isNaN(e)) return;
        onChange({kind: 'window', id: a.id, from: f, to: e});
      };
      from.addEventListener('change', apply);
      to.addEventListener('change', apply);
      const vis = el('input', {type: 'checkbox', checked: !a.hidden});
      vis.setAttribute('aria-label', `Show ${name}`);
      vis.addEventListener('change', () => onChange({kind: 'toggle', id: a.id, hidden: !vis.checked}));
      return el('div', {className: 'ap-row ap-item'}, vis, el('span', {textContent: name}), from, to,
        btn(`Show ${name} only around now`, 'At now', () => onChange({kind: 'window', id: a.id, from: cur.t, to: cur.t})),
        btn(`Delete ${name}`, 'Delete', () => onChange({kind: 'delete', id: a.id})));
    }));
    const nm = el('input', {type: 'text', placeholder: 'View name'});
    nm.setAttribute('aria-label', 'View name');
    const withT = el('input', {type: 'checkbox'});
    withT.setAttribute('aria-label', 'Store current time in view');
    const save = () => nm.value.trim() && onChange({kind: 'saveView', name: nm.value.trim(), t: withT.checked ? cur.t : null});
    viewRow.replaceChildren(nm, el('label', {}, withT, ' with time'), btn('Save view', 'Save view', save),
      ...cur.views.map(v => btn(`Apply view ${v.name}`, v.name, () => onChange({kind: 'applyView', name: v.name, t: v.t ?? null}))));
  }

  return {
    update({items, views, t}) {
      cur = {items, views, t};
      // Rebuild only when the model changes so typing and focus survive per-frame updates.
      const s = JSON.stringify([items, views]);
      if (s !== sig) { sig = s; build(); }
    },
  };
}
