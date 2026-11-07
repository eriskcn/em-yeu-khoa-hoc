import test from 'node:test';
import assert from 'node:assert/strict';
import { createHistory } from './snapshot-manager.js';

test('undo and redo in order', () => {
  const h = createHistory();
  h.reset('a');
  h.push('b');
  h.push('c');
  assert.equal(h.undo(), 'b');
  assert.equal(h.undo(), 'a');
  assert.equal(h.undo(), null);
  assert.equal(h.redo(), 'b');
  assert.equal(h.redo(), 'c');
  assert.equal(h.redo(), null);
  assert.equal(h.current(), 'c');
});

test('equal snapshot is skipped', () => {
  const h = createHistory();
  h.reset('a');
  h.push('a');
  assert.equal(h.canUndo(), false);
});

test('push clears redo', () => {
  const h = createHistory();
  h.reset('a');
  h.push('b');
  h.undo();
  assert.equal(h.canRedo(), true);
  h.push('c');
  assert.equal(h.canRedo(), false);
  assert.equal(h.undo(), 'a');
});

test('limit trims oldest', () => {
  const h = createHistory(3);
  h.reset('a');
  ['b', 'c', 'd'].forEach(s => h.push(s));
  assert.equal(h.undo(), 'c');
  assert.equal(h.undo(), 'b');
  assert.equal(h.undo(), null);
});
