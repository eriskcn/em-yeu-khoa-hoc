import {FORMATS} from './match-rules.js';
import {createTeam} from '../entities/team.js';
import {createBall} from '../entities/ball.js';

const clamp01 = v => Math.min(1, Math.max(0, v));

// Setup snapshot: where everything is before the situation starts.
export function createSetup(format) {
  const f = FORMATS[format];
  if (!f) throw new Error(`unsupported format: ${format}`);
  const n = f.formation.length;
  return {
    format,
    players: [...createTeam(0, f.formation, 0), ...createTeam(1, f.formation, n)],
    ball: createBall(.5, .5)
  };
}

// State updates return a new object and never mutate the input.
export const movePlayer = (s, id, x, y) => ({
  ...s,
  players: s.players.map(p => (p.id === id ? {...p, x: clamp01(x), y: clamp01(y)} : p))
});

export const moveBall = (s, x, y) => ({...s, ball: {x: clamp01(x), y: clamp01(y)}});
