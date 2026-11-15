import test from 'node:test';
import assert from 'node:assert/strict';
import {analyze} from './tactical-analyzer.js';

const P = (id, team, num, x, y) => ({id, team, num, x, y});
const state = {players: [P(0, 0, 1, .05, .5), P(1, 0, 2, .3, .3), P(2, 0, 3, .4, .7), P(3, 1, 1, .95, .5), P(4, 1, 2, .6, .5)], ball: {x: .3, y: .3, owner: 1, status: 'controlled'}};
const events = [{id: 'e1', type: 'pass', actor: 1, target: 2, t: 1, dur: 1}, {id: 'e2', type: 'pass', actor: 2, target: 1, t: 2, dur: 1}];

test('analyze returns the expected shape and is JSON-safe', () => {
  const a = analyze({state, events, aspect: 1.5, t: 1.5, stateAt: () => state, duration: 1});
  assert.deepEqual(Object.keys(a), ['exact', 'approximate', 'passes']);
  assert.deepEqual(Object.keys(a.exact.team0), ['centroid', 'width', 'depth', 'lineHeights', 'compactness', 'spaceBetweenLines']);
  assert.deepEqual(a.exact.ball, {owner: 1, status: 'controlled'});
  assert.ok(Math.abs(a.exact.team0.width - .4 / 1.5) < 1e-9);
  assert.equal(a.approximate.possession.team0, 1);
  assert.equal(a.approximate.laneRisks.length, 1);
  assert.equal(a.approximate.laneRisks[0].eventId, 'e1');
  assert.ok(a.approximate.note.length > 0);
  assert.deepEqual(a.passes.sequences, [['e1', 'e2']]);
  assert.deepEqual(a.passes.counts.team0.totals.made, {1: 1, 2: 1});
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
});

test('analyze without stateAt or passes', () => {
  const a = analyze({state, aspect: 1.5});
  assert.equal(a.approximate.possession, null);
  assert.deepEqual(a.approximate.laneRisks, []);
});
