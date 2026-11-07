import test from 'node:test';
import assert from 'node:assert/strict';
import {createSetup, movePlayer, moveBall} from './match-state.js';

test('7v7 setup has 14 players, 7 per team, and a centred ball', () => {
  const s = createSetup(7);
  assert.equal(s.players.length, 14);
  assert.equal(s.players.filter(p => p.team === 0).length, 7);
  assert.deepEqual(s.ball, {x: .5, y: .5});
  assert.deepEqual(s.players.map(p => p.id), [...Array(14).keys()]);
});

test('teams are mirrored left and right', () => {
  const s = createSetup(7);
  assert.ok(s.players.filter(p => p.team === 0).every(p => p.x < .5));
  assert.ok(s.players.filter(p => p.team === 1).every(p => p.x > .5));
});

test('movePlayer clamps to the pitch and does not mutate', () => {
  const s = createSetup(7);
  const before = JSON.stringify(s);
  const m = movePlayer(s, 3, 2, -1);
  assert.equal(JSON.stringify(s), before);
  assert.deepEqual([m.players[3].x, m.players[3].y], [1, 0]);
  assert.equal(moveBall(s, -5, .3).ball.x, 0);
});

test('unsupported format throws', () => {
  assert.throws(() => createSetup(11));
});
