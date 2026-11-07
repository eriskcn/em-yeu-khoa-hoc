import test from 'node:test';
import assert from 'node:assert/strict';
import {kickoff} from './scenarios.js';
import {validateEvents} from './action-validator.js';
import {stateAt, duration} from './simulation-engine.js';

test('kick-off scenario passes the simulate-mode rules and ends with player 4 on the ball', () => {
  const {setup, events} = kickoff(7);
  assert.deepEqual(validateEvents(setup, events, 'simulate'), []);
  assert.deepEqual([setup.ball.x, setup.ball.y, setup.ball.owner], [.5, .5, 5]);
  assert.equal(stateAt(setup, events, duration(events)).ball.owner, 4);
});
