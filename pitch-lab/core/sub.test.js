import test from 'node:test';
import assert from 'node:assert/strict';
import {createSetup} from './match-state.js';
import {stateAt} from './simulation-engine.js';
import {validateEvents} from './action-validator.js';
import {restartSetup} from './match-flow.js';

const setup = createSetup(7);
const sub = (id, off, t = 1, team = 0) => ({id, type: 'sub', t, team, off, on: 20 + id});

test('valid sub is not malformed and overrides num from t', () => {
  const evs = [sub(1, 2)];
  assert.deepEqual(validateEvents(setup, evs), []);
  assert.equal(stateAt(setup, evs, .5).players[2].num, setup.players[2].num);
  const p = stateAt(setup, evs, 1).players[2];
  assert.deepEqual([p.num, p.id, p.x, p.y], [21, 2, setup.players[2].x, setup.players[2].y]);
});

test('sub beyond maxSubs or of an already-subbed player: rejected in simulate, flagged in edit', () => {
  const six = [0, 1, 2, 3, 4, 5].map(i => sub(i + 1, i, i));
  const r = validateEvents(setup, six);
  assert.deepEqual(r.map(i => [i.eventId, i.code, i.level]), [[6, 'max-subs', 'rejected']]);
  assert.equal(validateEvents(setup, six, 'edit')[0].level, 'flagged');
  assert.equal(validateEvents(setup, [sub(1, 2), sub(2, 2, 2)])[0].code, 'already-subbed');
  assert.equal(validateEvents(setup, [sub(1, 9)])[0].code, 'malformed'); // off from other team
});

test('restartSetup places the ball and gives it to the nearest player of the team', () => {
  const r = restartSetup(setup, {kind: 'throw-in', team: 1, at: {x: .6, y: 0}});
  const near = setup.players.filter(p => p.team === 1).sort((a, b) => Math.hypot(a.x - .6, a.y) - Math.hypot(b.x - .6, b.y))[0];
  assert.deepEqual([r.ball.x, r.ball.y, r.ball.owner], [.6, 0, near.id]);
  assert.equal(setup.ball.owner ?? null, null); // input untouched
});
