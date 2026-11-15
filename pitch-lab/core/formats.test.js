import test from 'node:test';
import assert from 'node:assert/strict';
import {createSetup, movePlayer, setOwner} from './match-state.js';
import {kickoff} from './scenarios.js';
import {validateEvents} from './action-validator.js';

for (const n of [5, 7, 11]) {
  test(`${n}v${n}: player count and kick-off validates`, () => {
    assert.equal(createSetup(n).players.length, 2 * n);
    const {setup, events} = kickoff(n);
    assert.deepEqual(validateEvents(setup, events, 'simulate'), []);
  });
}

// Team 0 passes from id 1 (x .4) to id 2 (x .9), past the team 1 back line (.86), keeper aside.
function offsidePass(n) {
  let s = createSetup(n);
  s = movePlayer(s, 1, .4, .5);
  s = movePlayer(s, 2, .9, .5);
  s = setOwner(s, 1);
  return validateEvents(s, [{id: 1, type: 'pass', actor: 1, target: 2, t: 0, dur: 1}], 'simulate');
}

test('offside pass warns in 11v11 only', () => {
  assert.deepEqual(offsidePass(11).map(i => [i.code, i.level]), [['offside', 'warning']]);
  assert.deepEqual(offsidePass(7), []);
});
