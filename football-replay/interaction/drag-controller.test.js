import test from 'node:test';
import assert from 'node:assert/strict';
import {createDragController} from './drag-controller.js';
import {playerRadius, hitRadius, toPx} from '../rendering/pitch-renderer.js';
import {createSetup} from '../core/match-state.js';

test('hit radius is at least 22 px while drawn radius stays small', () => {
  assert.ok(playerRadius(812) < 22);
  assert.ok(hitRadius(812) >= 22);
});

test('drag grabs a player 20 px away on a small canvas', () => {
  const setup = createSetup(11), size = {w: 812, h: 375};
  const q = toPx(setup.players[3], size.w, size.h);
  const d = createDragController({getState: () => setup, setState() {}, getSize: () => size});
  assert.equal(d.down({x: q.x + 20, y: q.y}), true);
});
