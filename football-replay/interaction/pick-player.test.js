import test from 'node:test';
import assert from 'node:assert/strict';
import {pickPlayer} from './pick-player.js';

const c = [{id: 'a', team: 1}, {id: 'b', team: 0}];
test('pass prefers teammate, tackle prefers opponent', () => {
  assert.equal(pickPlayer(c, 'pass', 0).id, 'b');
  assert.equal(pickPlayer(c, 'cross', 0).id, 'b');
  assert.equal(pickPlayer(c, 'tackle', 1).id, 'b');
});
test('falls back to topmost', () => {
  assert.equal(pickPlayer(c, 'shot', 0).id, 'a');
  assert.equal(pickPlayer(c, 'pass', null).id, 'a');
  assert.equal(pickPlayer([c[0]], 'pass', 0).id, 'a');
  assert.equal(pickPlayer([], 'pass', 0), undefined);
});
