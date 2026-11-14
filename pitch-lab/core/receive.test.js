import test from 'node:test';
import assert from 'node:assert/strict';
import {createSetup, setOwner} from './match-state.js';
import {stateAt, RECEIVE_REACH, metres} from './simulation-engine.js';
import {addEvent} from './event-engine.js';
import {planReceive} from '../interaction/receive-plan.js';

const [A, B] = [5, 6];
const setup = setOwner(createSetup(7), A);
const spot = {x: .6, y: .4};
const pass = {type: 'pass', actor: A, target: spot, t: 0, dur: 1};
const add = (evs, e, mode = 'simulate') => addEvent(evs, e, mode, setup);
const afterPass = add([], pass).events;

test('receive is rejected when the player is out of reach of the loose ball', () => {
  const r = add(afterPass, {type: 'receive', actor: B, t: 1, dur: .5});
  assert.ok(r.issues.some(i => i.code === 'too-far' && i.level === 'rejected'));
  assert.equal(r.events.length, 1);
  assert.ok(add(afterPass, {type: 'receive', actor: B, t: 1, dur: .5}, 'edit').issues.some(i => i.code === 'too-far' && i.level === 'flagged'));
});

test('planReceive adds a run when far, and the plan is accepted and ends with B controlling the ball', () => {
  const plan = planReceive(setup, afterPass, B, 1);
  assert.deepEqual(plan.events.map(e => e.type), ['move', 'receive']);
  assert.ok(metres(setup, stateAt(setup, afterPass, 1).players.find(p => p.id === B), spot) > RECEIVE_REACH);
  const evs = plan.events.reduce((acc, e) => {
    const r = add(acc, e);
    assert.equal(r.issues.filter(i => i.level === 'rejected').length, 0, JSON.stringify(r.issues));
    return r.events;
  }, afterPass);
  const s = stateAt(setup, evs, 10);
  assert.equal(s.ball.owner, B);
  assert.equal(s.ball.status, 'controlled');
});

test('planReceive: no run when already close, error when the ball is not loose', () => {
  const near = add(afterPass, {type: 'move', actor: B, to: spot, t: 1, dur: 1}).events;
  assert.deepEqual(planReceive(setup, near, B, 2).events.map(e => e.type), ['receive']);
  assert.ok(planReceive(setup, [], B, 0).error);
});

test('receive while a player controls the ball is rejected', () => {
  const r = add([], {type: 'receive', actor: B, t: 0, dur: .5});
  assert.ok(r.issues.some(i => i.code === 'bad-receive' && i.level === 'rejected'));
});
