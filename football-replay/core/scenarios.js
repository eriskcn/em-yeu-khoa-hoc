import {createSetup, movePlayer, setOwner} from './match-state.js';

// Team 0 kicks off: the striker (id 5) taps back to the other striker (6), who plays on to a midfielder (4).
export function kickoff(format) {
  let setup = createSetup(format);
  setup = movePlayer(setup, 5, .5, .5);
  setup = movePlayer(setup, 6, .47, .58);
  setup = setOwner(setup, 5);
  const events = [
    {id: 1, type: 'pass', actor: 5, target: 6, t: 0, dur: .8},
    {id: 2, type: 'pass', actor: 6, target: 4, t: .8, dur: .8},
    {id: 3, type: 'move', actor: 5, to: {x: .62, y: .3}, t: .8, dur: 1.6}
  ];
  return {setup, events};
}
