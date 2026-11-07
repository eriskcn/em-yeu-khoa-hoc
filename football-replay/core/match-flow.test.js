import test from 'node:test';
import assert from 'node:assert/strict';
import {createSetup, setOwner} from './match-state.js';
import {matchFlow} from './match-flow.js';

const setup = setOwner(createSetup(7), 0); // player 0 is team 0
const shot = target => ({id: 1, type: 'shot', actor: 0, target, t: 0, dur: 1});

test('shot past the goal line inside the mouth is a goal and a kick-off for the conceder', () => {
  const f = matchFlow(setup, [shot({x: 1.1, y: .5})]);
  assert.deepEqual(f.score, [1, 0]);
  assert.equal(f.restarts.length, 1);
  assert.deepEqual([f.restarts[0].kind, f.restarts[0].team, f.restarts[0].at], ['kickoff', 1, {x: .5, y: .5}]);
});

test('over the touchline: throw-in for the opposing team, on the line', () => {
  const f = matchFlow(setup, [shot({x: .5, y: -.2})]);
  assert.deepEqual(f.score, [0, 0]);
  assert.equal(f.restarts[0].kind, 'throw-in');
  assert.equal(f.restarts[0].team, 1);
  assert.equal(f.restarts[0].at.y, 0);
});

test('wide of the goal line: goal kick if the attacker touched last, corner if the defender did', () => {
  const wide = matchFlow(setup, [shot({x: 1.1, y: .9})]);
  assert.deepEqual([wide.restarts[0].kind, wide.restarts[0].team], ['goal-kick', 1]);
  assert.equal(wide.restarts[0].at.x, .94);
  const own = matchFlow(setup, [shot({x: -.1, y: .9})]);
  assert.deepEqual([own.restarts[0].kind, own.restarts[0].team, own.restarts[0].at.y], ['corner', 1, 1]);
});

test('ball staying inside gives no restart; substitutions are capped per team', () => {
  const subs = Array.from({length: 7}, (_, i) => ({id: 10 + i, type: 'sub', t: i, team: 0, off: i, on: 20 + i}));
  const f = matchFlow(setup, [shot({x: .8, y: .5}), ...subs]);
  assert.deepEqual(f.restarts, []);
  assert.equal(f.substitutions.length, 5);
  assert.deepEqual(f.substitutions[0], {t: 0, team: 0, off: 0, on: 20});
});
