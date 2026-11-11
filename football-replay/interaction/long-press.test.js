import test from 'node:test';
import assert from 'node:assert/strict';
import {createLongPress} from './long-press.js';

const fake = () => {
  const t = {fn: null, cleared: 0};
  t.setTimer = fn => { t.fn = fn; return 1; };
  t.clearTimer = () => { t.cleared++; t.fn = null; };
  return t;
};

test('fires with the start point', () => {
  const t = fake(), got = [];
  const lp = createLongPress({onFire: p => got.push(p), ...t});
  lp.start({x: 5, y: 6});
  t.fn();
  assert.deepEqual(got, [{x: 5, y: 6}]);
});

test('movement beyond slop cancels, small jitter does not', () => {
  const t = fake(), got = [];
  const lp = createLongPress({slop: 10, onFire: p => got.push(p), ...t});
  lp.start({x: 0, y: 0});
  lp.move({x: 3, y: 4});
  assert.ok(t.fn);
  lp.move({x: 20, y: 0});
  assert.equal(t.fn, null);
  assert.deepEqual(got, []);
});

test('cancel disarms', () => {
  const t = fake();
  const lp = createLongPress({onFire() {}, ...t});
  lp.start({x: 0, y: 0});
  lp.cancel();
  assert.equal(t.fn, null);
});
