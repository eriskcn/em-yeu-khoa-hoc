import test from 'node:test';
import assert from 'node:assert/strict';
import * as sp from './spatial-analysis.js';

const P = (id, team, num, x, y) => ({id, team, num, x, y});
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

// GK (num 1) is excluded from outfield metrics.
const line = {players: [P(0, 0, 1, .05, .5), P(1, 0, 2, .2, .1), P(2, 0, 3, .4, .5), P(3, 0, 4, .6, .9)], ball: {x: .5, y: .5}};

test('width/depth from outfield extents; aspect scales width', () => {
  close(sp.teamWidth(line, 0, 1), .8);
  close(sp.teamWidth(line, 0, 2), .4);
  close(sp.teamDepth(line, 0), .4);
});

test('distance respects aspect', () => {
  close(sp.distance({x: 0, y: 0}, {x: 0, y: .3}, 1.5), .2);
  close(sp.distance({x: 0, y: 0}, {x: .3, y: .4}, 1), .5);
});

test('centroid', () => {
  const c = sp.teamCentroid(line, 0);
  close(c.x, 1.25 / 4); close(c.y, .5);
});

const square = {players: [P(0, 0, 1, .5, .5), P(1, 0, 2, .2, .2), P(2, 0, 3, .4, .2), P(3, 0, 4, .4, .4), P(4, 0, 5, .2, .4), P(5, 0, 6, .3, .3)], ball: {x: 0, y: 0}};
test('compactness is hull area, ignores interior points, aspect applies', () => {
  close(sp.compactness(square, 0, 1), .04);
  close(sp.compactness(square, 0, 2), .02);
  assert.equal(sp.compactness({players: [P(0, 0, 1, 0, 0), P(1, 0, 2, 1, 1), P(2, 0, 3, 0, 1)]}, 0, 1), 0);
});

test('lineHeights flips for team 1', () => {
  const s = {players: [P(0, 1, 1, .95, .5), P(1, 1, 2, .9, .5), P(2, 1, 3, .5, .5), P(3, 1, 4, .1, .5), P(4, 1, 5, .2, .5)], ball: {x: 0, y: 0}};
  const h = sp.lineHeights(s, 1);
  close(h.defence, .1); close(h.midfield, .5); close(h.attack, .85);
  close(sp.spaceBetweenLines(s, 1), .75);
});

test('lineHeights team 0 and empty third', () => {
  const h = sp.lineHeights(line, 0);
  close(h.defence, .2); close(h.midfield, .5); assert.equal(h.attack, null);
  assert.equal(sp.spaceBetweenLines(line, 0), null);
});

test('nearestOpponent uses aspect', () => {
  const s = {players: [P(0, 0, 1, .5, .5), P(1, 1, 1, .5, .8), P(2, 1, 2, .6, .5)], ball: {x: 0, y: 0}};
  let r = sp.nearestOpponent(s, 0, 1);
  assert.equal(r.id, 2); close(r.distance, .1);
  r = sp.nearestOpponent(s, 0, 6);
  assert.equal(r.id, 1); close(r.distance, .05);
});
