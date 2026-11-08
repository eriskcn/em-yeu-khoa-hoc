import {FORMATION_SETS} from '../core/formations.js';

// Formation select per team + flip-orientation button. No state of its own.
export function createSetupPanel(root, {onChange}) {
  const el = (tag, text) => {
    const e = document.createElement(tag);
    if (text) e.textContent = text;
    root.append(e);
    return e;
  };
  const sels = [0, 1].map(team => {
    const label = el('label', `${team ? 'Red' : 'Blue'} formation `);
    const sel = document.createElement('select');
    label.append(sel);
    sel.addEventListener('change', () => onChange({kind: 'formation', team, name: sel.value}));
    return sel;
  });
  const flip = el('button', 'Flip sides');
  flip.type = 'button';
  flip.addEventListener('click', () => onChange({kind: 'flip'}));
  return {
    update({format, formationNames}) {
      sels.forEach((sel, t) => {
        const names = Object.keys(FORMATION_SETS[format] ?? {});
        const cur = formationNames?.[t];
        if (!names.includes(cur)) names.unshift('');
        sel.replaceChildren(...names.map(n => {
          const o = document.createElement('option');
          o.value = n;
          o.textContent = n || 'Custom';
          o.disabled = !n;
          return o;
        }));
        sel.value = names.includes(cur) ? cur : '';
      });
    }
  };
}
