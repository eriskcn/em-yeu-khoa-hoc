import test from 'node:test';
import assert from 'node:assert/strict';
import { eventsAt, nextEventTime, prevEventTime, clampTime } from './timeline.js';

const ev = [
  { id: 1, t: 0, dur: 1 },
  { id: 2, t: 1, dur: 1 },
  { id: 3, t: 1, dur: 2 },
];

test('eventsAt is inclusive at both ends', () => {
  assert.deepEqual(eventsAt(ev, 1).map(e => e.id), [1, 2, 3]);
  assert.deepEqual(eventsAt(ev, 3).map(e => e.id), [3]);
  assert.deepEqual(eventsAt(ev, 3.5), []);
});

test('nextEventTime is strict and handles ties', () => {
  assert.equal(nextEventTime(ev, 0), 1);
  assert.equal(nextEventTime(ev, 1), null);
  assert.equal(nextEventTime(ev, 1 - 1e-12), null);
  assert.equal(nextEventTime([], 0), null);
});

test('prevEventTime is strict and handles ties', () => {
  assert.equal(prevEventTime(ev, 2), 1);
  assert.equal(prevEventTime(ev, 1), 0);
  assert.equal(prevEventTime(ev, 0), null);
});

test('clampTime', () => {
  assert.equal(clampTime(-1, 4), 0);
  assert.equal(clampTime(5, 4), 4);
  assert.equal(clampTime(2, 4), 2);
});
