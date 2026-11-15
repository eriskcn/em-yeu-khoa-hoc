import test from 'node:test';
import assert from 'node:assert/strict';
import { createReplay } from './replay-engine.js';

function setup(duration = 4) {
  let clock = 0, queue = [];
  const log = { times: [], states: [] };
  const r = createReplay({
    getDuration: () => duration,
    onTime: t => log.times.push(t),
    onPlayState: p => log.states.push(p),
    raf: cb => queue.push(cb),
    now: () => clock,
  });
  const advance = ms => {
    clock += ms;
    const cbs = queue;
    queue = [];
    cbs.forEach(cb => cb());
  };
  return { r, log, advance, queued: () => queue.length };
}

test('advances at speed', () => {
  const { r, advance } = setup();
  r.setSpeed(2);
  r.play();
  advance(500);
  assert.equal(r.getTime(), 1);
});

test('stops at end and play restarts from 0', () => {
  const { r, log, advance, queued } = setup(1);
  r.play();
  advance(2000);
  assert.equal(r.getTime(), 1);
  assert.equal(r.isPlaying(), false);
  assert.deepEqual(log.states, [true, false]);
  assert.equal(queued(), 0);
  r.play();
  assert.equal(r.getTime(), 0);
  assert.equal(r.isPlaying(), true);
});

test('seek clamps and always calls onTime', () => {
  const { r, log } = setup();
  r.seek(9);
  r.seek(-3);
  assert.deepEqual(log.times, [4, 0]);
});

test('step negative clamps at 0', () => {
  const { r } = setup();
  r.step(-5);
  assert.equal(r.getTime(), 0);
  r.step(30);
  assert.ok(Math.abs(r.getTime() - 1) < 1e-9);
});

test('no rAF while paused, and pause/play keeps a single chain', () => {
  const { r, advance, queued } = setup();
  assert.equal(queued(), 0);
  r.play();
  assert.equal(queued(), 1);
  r.pause();
  r.play();
  assert.equal(queued(), 1);
  advance(100);
  assert.equal(queued(), 1);
  r.pause();
  advance(100);
  assert.equal(queued(), 0);
  r.seek(1);
  assert.equal(queued(), 0);
});
