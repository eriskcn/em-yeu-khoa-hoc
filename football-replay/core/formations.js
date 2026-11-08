import {FORMATS} from './match-rules.js';

// Named formations as outfield rows, back to front (GK is implicit). Role per row: first DF, last FW, others MF.
// ORIENTATION: setup.flipped (absent = false) means team 0 attacks LEFT. flipOrientation mirrors every x and
// toggles that flag. goalOf (match-rules.js), kickoff(format, flipped), matchFlow and the
// offside check honour it.
const ROWS = {
  5: {'2-2': [2, 2], '1-2-1': [1, 2, 1]},
  7: {'2-3-1': [2, 3, 1], '3-2-1': [3, 2, 1], '2-2-2': [2, 2, 2]},
  11: {'4-4-2': [4, 4, 2], '4-3-3': [4, 3, 3], '3-5-2': [3, 5, 2]}
};
const roleOfRow = (i, n) => (i === 0 ? 'DF' : i === n - 1 ? 'FW' : 'MF');

// name -> [{x, y, role}] for team 0 attacking right (GK first); x range is taken from the format's own layout.
function build(format, rows) {
  const f = FORMATS[format].formation;
  const back = f[1][0], front = f[f.length - 1][0];
  return [{x: f[0][0], y: .5, role: 'GK'}, ...rows.flatMap((m, i) => Array.from({length: m}, (_, j) => ({
    x: rows.length === 1 ? back : back + (front - back) * i / (rows.length - 1),
    y: (j + 1) / (m + 1),
    role: roleOfRow(i, rows.length)
  })))];
}
export const FORMATION_SETS = Object.fromEntries(Object.entries(ROWS).map(([fmt, sets]) =>
  [fmt, Object.fromEntries(Object.entries(sets).map(([name, rows]) => [name, build(Number(fmt), rows)]))]));

// New setup with the team's players (in id order) placed in the named formation. Ball/owner untouched.
export function applyFormation(setup, team, name) {
  const pos = FORMATION_SETS[setup.format]?.[name];
  if (!pos) throw new Error(`unknown formation: ${name}`);
  const ids = setup.players.filter(p => p.team === team).map(p => p.id).sort((a, b) => a - b);
  const mirror = (team === 1) !== !!setup.flipped;
  return {...setup, players: setup.players.map(p => {
    const i = ids.indexOf(p.id);
    if (i < 0 || i >= pos.length) return p;
    return {...p, x: mirror ? 1 - pos[i].x : pos[i].x, y: pos[i].y, role: pos[i].role};
  })};
}

// Mirror every x (players and ball); an involution. A held ball stays on its owner since both mirror.
export function flipOrientation(setup) {
  const {flipped, ...rest} = setup;
  return {...rest, ...(flipped ? {} : {flipped: true}),
    players: setup.players.map(p => ({...p, x: 1 - p.x})),
    ball: {...setup.ball, x: 1 - setup.ball.x}};
}

// Role of a player; falls back to GK for a team's first player when no formation was applied.
export function roleOf(setup, id) {
  const p = setup.players.find(q => q.id === id);
  if (!p) return null;
  if (p.role) return p.role;
  return setup.players.find(q => q.team === p.team)?.id === id ? 'GK' : null;
}
