import test from 'node:test';
import assert from 'node:assert/strict';
import { rowsFor } from './timeline-panel.js';

test('rowsFor stacks same/near-time events and reuses rows when apart', () => {
  const ev = [{ t: 0 }, { t: 0 }, { t: 0.5 }, { t: 50 }];
  assert.deepEqual(rowsFor(ev, 100), [0, 1, 2, 0]);
});

test('rowsFor caps rows', () => {
  const ev = Array.from({ length: 6 }, () => ({ t: 1 }));
  assert.equal(Math.max(...rowsFor(ev, 100)), 3);
});
