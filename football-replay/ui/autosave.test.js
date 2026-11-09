import test from 'node:test';
import assert from 'node:assert/strict';
import {createAutosave} from './autosave.js';

const fake = () => { const m = new Map(); return {setItem: (k, v) => m.set(k, v), getItem: k => m.has(k) ? m.get(k) : null}; };

test('save then load round-trips', () => {
  const a = createAutosave(fake(), 'k');
  a.save('{"x":1}');
  assert.equal(a.load(), '{"x":1}');
});
test('empty storage loads null', () => assert.equal(createAutosave(fake(), 'k').load(), null));
test('throwing storage neither throws nor loads', () => {
  const boom = () => { throw new Error('denied'); };
  const a = createAutosave({setItem: boom, getItem: boom}, 'k');
  assert.doesNotThrow(() => a.save('x'));
  assert.equal(a.load(), null);
});
