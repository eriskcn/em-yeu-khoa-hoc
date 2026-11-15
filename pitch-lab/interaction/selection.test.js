import test from 'node:test';
import assert from 'node:assert/strict';
import {createSelection, toggle, set, clear, has, playersInRect, moveSelected} from './selection.js';

const players = [{id: 'a', x: 0.25, y: 0.5}, {id: 'b', x: 0.5, y: 0.5}, {id: 'c', x: 0.95, y: 0.1}];

test('toggle/set/clear are immutable', () => {
  const s0 = createSelection();
  const s1 = toggle(s0, 'a');
  assert.ok(has(s1, 'a') && !has(s0, 'a'));
  assert.ok(!has(toggle(s1, 'a'), 'a'));
  assert.deepEqual([...set(s1, ['b', 'c']).ids], ['b', 'c']);
  assert.equal(clear(s1).ids.size, 0);
  assert.ok(has(s1, 'a'));
});

test('playersInRect accepts any corner order', () => {
  assert.deepEqual(playersInRect(players, {x0: 0.6, y0: 0.6, x1: 0.1, y1: 0.4}), ['a', 'b']);
  assert.deepEqual(playersInRect(players, {x0: 0.9, y0: 0, x1: 1, y1: 0.2}), ['c']);
});

test('moveSelected moves only selected, clamps, does not mutate', () => {
  const setup = {players, ball: {x: 0, y: 0}};
  const out = moveSelected(setup, new Set(['a', 'c']), 0.25, -0.3);
  assert.deepEqual(out.players.map(p => [p.x, p.y]), [[0.5, 0.2], [0.5, 0.5], [1, 0]]);
  assert.equal(setup.players[0].x, 0.25);
  assert.equal(out.ball, setup.ball);
});
