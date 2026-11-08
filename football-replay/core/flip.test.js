import test from 'node:test';
import assert from 'node:assert/strict';
import {createSetup, movePlayer, setOwner} from './match-state.js';
import {flipOrientation} from './formations.js';
import {kickoff} from './scenarios.js';
import {matchFlow, restartSetup} from './match-flow.js';
import {validateEvents} from './action-validator.js';

const flipped = () => flipOrientation(setOwner(createSetup(7), 5));
const shot = target => ({id: 1, type: 'shot', actor: 5, target, t: 0, dur: 1});

test('flipped: team 0 scores at x=0 and team 1 kicks off', () => {
  const f = matchFlow(flipped(), [shot('goal')]);
  assert.deepEqual(f.score, [1, 0]);
  assert.deepEqual([f.restarts[0].kind, f.restarts[0].team], ['kickoff', 1]);
});

test('flipped: corner and goal-kick teams are mirrored', () => {
  const s = flipped();
  const wide = matchFlow(s, [shot({x: -.1, y: .9})]); // team 0 attacks x=0, shot wide: goal kick for team 1
  assert.deepEqual([wide.restarts[0].kind, wide.restarts[0].team, wide.restarts[0].at.x], ['goal-kick', 1, .06]);
  const own = matchFlow(s, [shot({x: 1.1, y: .9})]); // out at team 0's own end: corner for team 1
  assert.deepEqual([own.restarts[0].kind, own.restarts[0].team], ['corner', 1]);
});

test('flipped: penalty spot is by the goal the team attacks (x=.1 for team 0)', () => {
  const r = restartSetup(flipped(), {kind: 'penalty', team: 0});
  assert.equal(r.ball.x, .1);
});

test('kickoff(format, true) mirrors the unflipped scenario', () => {
  const a = kickoff(7), b = kickoff(7, true);
  assert.equal(b.setup.flipped, true);
  assert.deepEqual(b.setup.players.map(p => p.x), a.setup.players.map(p => 1 - p.x));
  assert.equal(b.events[2].to.x, 1 - a.events[2].to.x);
  assert.deepEqual(validateEvents(b.setup, b.events, 'simulate'), []);
});

test('offside direction mirrors when flipped', () => {
  let s = createSetup(11);
  s = movePlayer(s, 1, .4, .5);
  s = movePlayer(s, 2, .9, .5);
  s = setOwner(s, 1);
  const pass = [{id: 1, type: 'pass', actor: 1, target: 2, t: 0, dur: 1}];
  const flip = validateEvents(flipOrientation(s), pass, 'simulate'); // receiver now at .1, team 0 attacks left
  assert.deepEqual(flip.map(i => i.code), ['offside']);
});
