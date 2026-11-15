import {FORMATS} from '../core/match-rules.js';
import {FORMATION_SETS, roleSummary} from '../core/formations.js';

// Pitch size, formation select per team, roles, loose-ball and flip-orientation buttons. No state of its own.
export function createSetupPanel(root, {onChange}) {
  const el = (tag, text) => {
    const e = document.createElement(tag);
    if (text) e.textContent = text;
    root.append(e);
    return e;
  };
  const size = el('p');
  const sels = [0, 1].map(team => {
    const label = el('label', `${team ? 'Red' : 'Blue'} formation `);
    const sel = document.createElement('select');
    label.append(sel);
    sel.addEventListener('change', () => onChange({kind: 'formation', team, name: sel.value}));
    return sel;
  });
  const roles = [0, 1].map(() => el('p'));
  const loose = el('button', 'Loose ball');
  loose.type = 'button';
  loose.addEventListener('click', () => onChange({kind: 'loose'}));
  const flip = el('button', 'Flip sides');
  flip.type = 'button';
  flip.addEventListener('click', () => onChange({kind: 'flip'}));
  return {
    update({format, formationNames, setup}) {
      size.textContent = `Pitch ${FORMATS[format].pitch.join(' x ')} m`;
      roles.forEach((p, t) => { p.textContent = `${t ? 'Red' : 'Blue'} roles: ${roleSummary(setup, t).join(', ')}`; });
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
