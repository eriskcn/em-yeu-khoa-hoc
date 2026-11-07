import test from 'node:test';
import assert from 'node:assert/strict';
import {identity, zoomAt, pan} from './viewport.js';
import {toPx, toNorm} from '../rendering/pitch-renderer.js';

test('zoomAt keeps the focus point fixed and clamps scale', () => {
  const v = zoomAt(identity, 2, 100, 50);
  assert.equal(v.scale, 2);
  assert.deepEqual({x: 100 * v.scale + v.ox, y: 50 * v.scale + v.oy}, {x: 100, y: 50});
  assert.equal(zoomAt(v, 10, 100, 50).scale, 4);
  assert.equal(zoomAt(v, 0.01, 100, 50).scale, 1);
});

test('pan clamps so the pitch stays on screen', () => {
  const v = {scale: 2, ox: 0, oy: 0};
  assert.deepEqual(pan(v, 50, 50, 400, 300), v);
  const p = pan(v, -999, -999, 400, 300);
  assert.equal(p.ox, -400);
  assert.equal(p.oy, -300);
});

test('zoomAt with size stays within bounds', () => {
  const v = zoomAt(identity, 2, 0, 0, 400, 300);
  assert.equal(v.ox, 0);
  assert.equal(zoomAt(v, 0.5, 399, 299, 400, 300).ox, 0);
});

test('toPx/toNorm round trip with a view', () => {
  const view = {scale: 2.5, ox: -120, oy: -40}, p = {x: 0.3, y: 0.7};
  const n = toNorm(toPx(p, 400, 300, view), 400, 300, view);
  assert.ok(Math.abs(n.x - p.x) < 1e-9 && Math.abs(n.y - p.y) < 1e-9);
  assert.deepEqual(toPx(p, 400, 300), toPx(p, 400, 300, identity));
});
