import test from 'node:test';
import assert from 'node:assert/strict';
import {createSetup, setOwner} from './match-state.js';
import {matchFlow, restartSetup} from './match-flow.js';
import {stateAt} from './simulation-engine.js';
import {validateEvents} from './action-validator.js';

const setup = setOwner(createSetup(7), 5); // team 0 forward owns the ball; team 1 keeper = id 7
const shot = {id: 1, type: 'shot', actor: 5, target: {x: 1.1, y: .5}, t: 0, dur: 1};
const save = (actor = 7) => ({id: 2, type: 'save', actor, t: .6, dur: .3});

test('saved shot: no goal, keeper owns the ball', () => {
  const evs = [shot, save()];
  assert.deepEqual(validateEvents(setup, evs), []);
  assert.deepEqual(matchFlow(setup, evs).score, [0, 0]);
  assert.equal(matchFlow(setup, [shot]).score[0], 1);
  const b = stateAt(setup, evs, 2).ball;
  assert.equal(b.owner, 7);
  assert.equal(b.status, 'controlled');
  assert.equal(stateAt(setup, evs, .7).ball.status, 'in-transit');
});

test('save by a non-keeper is rejected (flagged in edit)', () => {
  const evs = [shot, save(8)];
  assert.equal(validateEvents(setup, evs)[0].code, 'bad-save');
  assert.equal(validateEvents(setup, evs)[0].level, 'rejected');
  assert.equal(validateEvents(setup, evs, 'edit')[0].level, 'flagged');
  assert.equal(validateEvents(setup, [save()])[0].code, 'bad-save');
});

test('full-time stops later goals; periods reported; malformed phase rejected', () => {
  const late = {id: 1, type: 'shot', actor: 5, target: {x: 1.1, y: .5}, t: 5, dur: 1};
  const f = matchFlow(setup, [late, {id: 2, type: 'phase', kind: 'full-time', t: 3}, {id: 3, type: 'phase', kind: 'half-time', t: 1}]);
  assert.deepEqual(f.score, [0, 0]);
  assert.deepEqual(f.periods, [{kind: 'half-time', t: 1}, {kind: 'full-time', t: 3}]);
  assert.equal(validateEvents(setup, [{id: 1, type: 'phase', kind: 'x', t: 1}])[0].code, 'malformed');
});

test('penalty: ball on the spot .1 from the goal, owned by a taker', () => {
  const s = restartSetup(setup, {kind: 'penalty', team: 0, at: {x: .5, y: .5}});
  assert.deepEqual([s.ball.x, s.ball.y], [.9, .5]);
  assert.equal(setup.players.find(p => p.id === s.ball.owner).team, 0);
  assert.equal(restartSetup(setup, {kind: 'penalty', team: 1, at: {x: 0, y: 0}}).ball.x, .1);
});
