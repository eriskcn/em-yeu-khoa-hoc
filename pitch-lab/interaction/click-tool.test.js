import test from 'node:test';
import assert from 'node:assert/strict';
import {nextClick, addedMessage} from './click-tool.js';

const spot = {x: .5, y: .5}, A = {id: 'a'}, B = {id: 'b'};

test('first click needs a player, then asks for the right second click', () => {
  assert.match(nextClick('pass', null, undefined, spot).msg, /performs the action/);
  assert.equal(nextClick('pass', null, undefined, spot).pending, null);
  assert.deepEqual(nextClick('move', null, A, spot), {pending: 'a', msg: 'Click the destination.'});
  assert.match(nextClick('tackle', null, A, spot).msg, /being tackled/);
  assert.match(nextClick('shot', null, A, spot).msg, /shooter again/);
  assert.match(nextClick('pass', null, A, spot).msg, /player or an empty spot/);
});
test('tackle keeps pending until a player is clicked', () => {
  const r = nextClick('tackle', 'a', undefined, spot);
  assert.equal(r.pending, 'a');
  assert.equal(r.ev, undefined);
  assert.deepEqual(nextClick('tackle', 'a', B, spot).ev, {type: 'tackle', actor: 'a', target: 'b', won: true, dur: .5});
});
test('shot: spot, other player, or the shooter again (goal)', () => {
  assert.equal(nextClick('shot', 'a', undefined, spot).ev.target, spot);
  assert.equal(nextClick('shot', 'a', B, spot).ev.target, 'b');
  assert.equal(nextClick('shot', 'a', A, spot).ev.target, 'goal');
});
test('move/dribble go to the spot; pass to player or spot; clicking the actor cancels a pass', () => {
  assert.deepEqual(nextClick('move', 'a', B, spot), {pending: null, ev: {type: 'move', actor: 'a', to: spot, dur: 1}});
  assert.equal(nextClick('dribble', 'a', undefined, spot).ev.to, spot);
  assert.equal(nextClick('pass', 'a', B, spot).ev.target, 'b');
  assert.equal(nextClick('cross', 'a', undefined, spot).ev.target, spot);
  assert.deepEqual(nextClick('pass', 'a', A, spot), {pending: null, msg: 'Cancelled.'});
});
test('addedMessage names actor and target, handles phase, spot, goal and warnings', () => {
  const num = id => `#${id}`;
  assert.equal(addedMessage({type: 'pass', actor: 'a', target: 'b', t: 1.5}, num), 'Pass #a -> #b added at 1.50 s');
  assert.equal(addedMessage({type: 'shot', actor: 'a', target: 'goal', t: 0}, num), 'Shot #a -> goal added at 0.00 s');
  assert.equal(addedMessage({type: 'move', actor: 'a', to: spot, t: 2}, num), 'Move #a added at 2.00 s');
  assert.equal(addedMessage({type: 'pass', actor: 'a', target: spot, t: 2}, num), 'Pass #a -> spot added at 2.00 s');
  assert.equal(addedMessage({type: 'sub', off: 'a', t: 3}, num), 'Sub #a added at 3.00 s');
  assert.equal(addedMessage({type: 'phase', kind: 'half-time', t: 4}, num, 'Warning: x'), 'Half-time added at 4.00 s. Warning: x');
});
