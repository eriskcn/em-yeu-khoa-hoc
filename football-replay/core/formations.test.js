import test from 'node:test';
import assert from 'node:assert/strict';
import {FORMATS} from './match-rules.js';
import {createSetup, setOwner} from './match-state.js';
import {FORMATION_SETS, applyFormation, flipOrientation, roleOf} from './formations.js';

test('every formation has the format player count, one GK, in range', () => {
  for (const [fmt, sets] of Object.entries(FORMATION_SETS)) {
    for (const [name, pos] of Object.entries(sets)) {
      assert.equal(pos.length, FORMATS[fmt].formation.length, name);
      assert.equal(pos.filter(p => p.role === 'GK').length, 1, name);
      assert.ok(pos.every(p => p.x >= 0 && p.x <= .5 && p.y > 0 && p.y < 1), name);
    }
  }
});

test('applyFormation keeps ids, ball and owner; mirrors team 1', () => {
  const s = setOwner(createSetup(7), 3);
  const a = applyFormation(s, 1, '3-2-1');
  assert.deepEqual(a.players.map(p => p.id), s.players.map(p => p.id));
  assert.deepEqual(a.ball, s.ball);
  assert.deepEqual(a.players.filter(p => p.team === 0), s.players.filter(p => p.team === 0));
  assert.equal(roleOf(a, 7), 'GK');
  assert.ok(a.players.filter(p => p.team === 1).every(p => p.x >= .5));
  assert.throws(() => applyFormation(s, 0, '9-9'));
});

test('flipOrientation is an involution and flips ball', () => {
  const s = applyFormation(createSetup(11), 0, '4-3-3');
  const f = flipOrientation(s);
  assert.equal(f.flipped, true);
  assert.equal(f.ball.x, 1 - s.ball.x);
  const r = flipOrientation(f);
  assert.equal(r.flipped, undefined);
  r.players.forEach((p, i) => { assert.ok(Math.abs(p.x - s.players[i].x) < 1e-12); assert.equal(p.y, s.players[i].y); }); // float: 1-(1-x)
  const g = applyFormation(f, 0, '4-4-2');
  assert.ok(g.players.filter(p => p.team === 0).every(p => p.x >= .5));
});

test('roleOf fallback', () => {
  const s = createSetup(5);
  assert.equal(roleOf(s, 0), 'GK');
  assert.equal(roleOf(s, 1), null);
});
