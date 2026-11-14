import test from 'node:test';
import assert from 'node:assert/strict';
import {timeToPx, pxToTime, snap, snapStep, fitView, clampView, zoomAbout, layers} from './timeline-scale.js';

test('time <-> px round trip', () => {
  const v = {t0: 2, pps: 50};
  assert.equal(timeToPx(3, v), 50);
  assert.equal(pxToTime(timeToPx(4.2, v), v), 4.2);
});

test('snap to 0.05 and snapStep keeps a step >= 4 px', () => {
  assert.equal(snap(1.234), 1.25);
  assert.equal(snap(0.02), 0);
  assert.equal(snapStep(100), 0.05);
  assert.ok(snapStep(10) * 10 >= 4);
});

test('fit shows whole duration; zoom out stops at fit; pan stays inside', () => {
  const f = fitView(10, 500);
  assert.deepEqual(f, {t0: 0, pps: 50});
  assert.deepEqual(clampView({t0: 3, pps: 10}, 10, 500), f);
  assert.equal(clampView({t0: 99, pps: 100}, 10, 500).t0, 5);
});

test('zoomAbout keeps the time under the cursor fixed', () => {
  const v = fitView(10, 500);
  const z = zoomAbout(v, 4, 250, 10, 500);
  assert.equal(z.pps, 200);
  assert.ok(Math.abs(pxToTime(250, z) - 5) < 1e-9);
  assert.equal(zoomAbout(v, 1e6, 0, 10, 500).pps, 1000);
});

test('layers: sorted by team/num, subs and match last, overlap gets lanes', () => {
  const players = [{id: 1, team: 1, num: 2}, {id: 2, team: 0, num: 9}, {id: 3, team: 0, num: 4}];
  const ev = [
    {id: 1, type: 'phase', t: 5, dur: 0}, {id: 2, type: 'sub', t: 4, dur: 0},
    {id: 3, type: 'pass', actor: 1, t: 0, dur: 1}, {id: 4, type: 'pass', actor: 2, t: 0, dur: 1},
    {id: 5, type: 'move', actor: 3, t: 0, dur: 2}, {id: 6, type: 'shot', actor: 3, t: 1, dur: 1},
    {id: 7, type: 'shot', actor: 3, t: 2, dur: 1}
  ];
  const rows = layers(ev, players);
  assert.deepEqual(rows.map(r => r.key), ['p3', 'p2', 'p1', 'sub', 'match']);
  assert.equal(rows[0].lanes, 2);
  assert.deepEqual(rows[0].laneOf, [0, 1, 0]);
});
