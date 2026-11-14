// Analysis metrics panel. Builds the DOM once; update() only changes text nodes.
const CSS = `.an-panel{font:13px system-ui,sans-serif;padding:8px}.an-panel h2,.an-panel h3{font-size:14px;margin:8px 0 4px}
.an-panel table{border-collapse:collapse;width:100%}.an-panel th,.an-panel td{text-align:left;padding:2px 6px;border-bottom:1px solid #ddd}
.an-approx{margin-top:12px;padding:6px;border:1px dashed #888}.an-note{font-style:italic}`;

const f2 = v => (v == null ? '-' : v.toFixed(2));
const ROWS = [
  ['Centroid x', a => f2(a.centroid.x)], ['Centroid y', a => f2(a.centroid.y)],
  ['Width', a => f2(a.width)], ['Depth', a => f2(a.depth)],
  ['Defence line', a => f2(a.lineHeights.defence)], ['Midfield line', a => f2(a.lineHeights.midfield)],
  ['Attack line', a => f2(a.lineHeights.attack)], ['Compactness (area)', a => f2(a.compactness)],
  ['Space between lines', a => f2(a.spaceBetweenLines)],
];

const el = (tag, parent, text, cls) => {
  const e = document.createElement(tag);
  if (text != null) e.textContent = text;
  if (cls) e.className = cls;
  parent.append(e);
  return e;
};

export function createAnalysisPanel(root) {
  el('style', document.head, CSS);
  const panel = el('section', root, null, 'an-panel');
  panel.setAttribute('aria-live', 'polite');
  panel.setAttribute('aria-label', 'Tactical analysis');
  el('h2', panel, 'Analysis (exact)');
  const ball = el('p', panel);
  const cells = [0, 1].map(team => {
    el('h3', panel, `Team ${team}`);
    const table = el('table', panel);
    return ROWS.map(([label]) => {
      const tr = el('tr', table);
      el('th', tr, label).scope = 'row';
      return el('td', tr, '-');
    });
  });
  const approx = el('div', panel, null, 'an-approx');
  el('h2', approx, 'Approximate');
  const possession = el('p', approx);
  const lanes = el('p', approx);
  const note = el('p', approx, null, 'an-note');

  return {
    update(a) {
      const {team0, team1, ball: b} = a.exact;
      ball.textContent = `Ball: owner ${b.owner ?? 'none'}, status ${b.status ?? 'unknown'}`;
      [team0, team1].forEach((m, i) => ROWS.forEach(([, get], r) => { cells[i][r].textContent = get(m); }));
      const p = a.approximate.possession;
      possession.textContent = p
        ? `Possession: team 0 ${f2(p.team0)}, team 1 ${f2(p.team1)}, loose ${f2(p.loose)}`
        : 'Possession: n/a';
      lanes.textContent = a.approximate.laneRisks.map(l =>
        `Pass ${l.from} to ${l.to}: ${l.opponentsNear} opponent(s) near lane, closest ${f2(l.closest)}`).join('; ') || 'No pass lane to assess';
      note.textContent = a.approximate.note;
    },
  };
}
