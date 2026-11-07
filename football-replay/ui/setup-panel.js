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
    const sel = el('select');
    sel.setAttribute('aria-label', `Team ${team + 1} formation`);
    sel.addEventListener('change', () => onChange({kind: 'formation', team, name: sel.value}));
    return sel;
  });
  const flip = el('button', 'Flip sides');
  flip.type = 'button';
  flip.addEventListener('click', () => onChange({kind: 'flip'}));
  return {
    update({format, formationNames}) {
      sels.forEach((sel, t) => {
        sel.replaceChildren(...Object.keys(FORMATION_SETS[format] ?? {}).map(n => {
          const o = document.createElement('option');
          o.value = o.textContent = n;
          return o;
        }));
        sel.value = formationNames?.[t] ?? '';
      });
    }
  };
}
