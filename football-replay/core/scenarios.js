import {FORMATS} from './match-rules.js';
import {createSetup, movePlayer, setOwner} from './match-state.js';

// Team 0 kicks off: one forward taps back to the other forward, who plays on to the player behind them (7v7: ids 5, 6, 4).
export function kickoff(format) {
  let setup = createSetup(format);
  const n = FORMATS[format].formation.length;
  const [a, b, c] = [n - 2, n - 1, n - 3];
  setup = movePlayer(setup, a, .5, .5);
  setup = movePlayer(setup, b, .47, .58);
  setup = setOwner(setup, a);
  const events = [
    {id: 1, type: 'pass', actor: a, target: b, t: 0, dur: .8},
    {id: 2, type: 'pass', actor: b, target: c, t: .8, dur: .8},
    {id: 3, type: 'move', actor: a, to: {x: .62, y: .3}, t: .8, dur: 1.6}
  ];
  return {setup, events};
}
