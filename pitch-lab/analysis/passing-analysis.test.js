import test from 'node:test';
import assert from 'node:assert/strict';
import {passEvents, passMatrix, passSequence, laneRisk, possessionShare} from './passing-analysis.js';

const P = (id, team, num, x, y) => ({id, team, num, x, y});
const ev = (id, type, actor, target, t) => ({id, type, actor, target, t, dur: 1});
const players = [P(0, 0, 1, 0, 0), P(1, 0, 2, 0, 0), P(2, 0, 3, 0, 0), P(9, 1, 1, 0, 0)];

test('passEvents keeps only pass/cross to a player', () => {
  const es = [ev('a', 'pass', 0, 1, 0), ev('b', 'shot', 1, 'goal', 1), ev('c', 'pass', 1, {x: 1, y: 1}, 2), ev('d', 'cross', 1, 2, 3)];
  assert.deepEqual(passEvents(es).map(e => e.id), ['a', 'd']);
});

test('passMatrix counts within the team only', () => {
  const es = [ev('a', 'pass', 0, 1, 0), ev('b', 'pass', 0, 1, 1), ev('c', 'pass', 1, 2, 2), ev('d', 'pass', 2, 9, 3)];
  const m = passMatrix(es, 0, players);
  assert.deepEqual(m.counts, {0: {1: 2}, 1: {2: 1}});
  assert.deepEqual(m.totals.made, {0: 2, 1: 1});
  assert.deepEqual(m.totals.received, {1: 2, 2: 1});
});

test('passSequence chains and breaks', () => {
  const es = [ev('a', 'pass', 0, 1, 0), ev('b', 'pass', 1, 2, 1), ev('c', 'pass', 0, 1, 2), ev('d', 'pass', 1, 2, 3)];
  assert.deepEqual(passSequence(es).map(s => s.map(e => e.id)), [['a', 'b'], ['c', 'd']]);
});

test('laneRisk: opponent on segment, far away, and beyond the end', () => {
  const base = [P(0, 0, 1, .2, .5), P(1, 0, 2, .6, .5)];
  let r = laneRisk({players: [...base, P(9, 1, 1, .4, .51)]}, 0, 1, 1);
  assert.equal(r.opponentsNear, 1);
  r = laneRisk({players: [...base, P(9, 1, 1, .4, .8)]}, 0, 1, 1);
  assert.equal(r.opponentsNear, 0); assert.ok(Math.abs(r.closest - .3) < 1e-9);
  r = laneRisk({players: [...base, P(9, 1, 1, .9, .5)]}, 0, 1, 1);
  assert.equal(r.opponentsNear, 0); assert.ok(Math.abs(r.closest - .3) < 1e-9);
  // aspect 2 shrinks the y offset 0.06 -> 0.03, inside the lane
  assert.equal(laneRisk({players: [...base, P(9, 1, 1, .4, .56)]}, 0, 1, 2).opponentsNear, 1);
});

test('possessionShare samples ball owner', () => {
  const stateAt = t => ({players, ball: {owner: t < 0.45 ? 0 : t < 0.75 ? 9 : null}});
  const r = possessionShare(stateAt, 0.9, 0.1);
  assert.equal(r.team0, 0.5); assert.equal(r.team1, 0.3); assert.equal(r.loose, 0.2);
});
