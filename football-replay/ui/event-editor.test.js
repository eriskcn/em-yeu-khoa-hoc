import test from 'node:test';
import assert from 'node:assert/strict';
import {reorderPatch, playerLabel} from './event-editor.js';

const evs = [{id: 1, t: 0.5}, {id: 2, t: 1}, {id: 3, t: 2}];

test('reorderPatch moves just past the neighbour', () => {
  assert.deepEqual(reorderPatch(evs, 2, -1), {t: 0.49});
  assert.deepEqual(reorderPatch(evs, 3, -1), {t: 0.99});
  assert.deepEqual(reorderPatch(evs, 2, 1), {t: 2.01});
});

test('reorderPatch returns null at the ends or for unknown id', () => {
  assert.equal(reorderPatch(evs, 1, -1), null);
  assert.equal(reorderPatch(evs, 3, 1), null);
  assert.equal(reorderPatch(evs, 9, 1), null);
});

test('playerLabel uses team colour and shirt number', () => {
  assert.equal(playerLabel({id: 4, team: 0, num: 5}), 'Blue #5');
  assert.equal(playerLabel({id: 15, team: 1, num: 5}), 'Red #5');
});
