import test from 'node:test';
import assert from 'node:assert/strict';
import {createSetup, setOwner} from './match-state.js';
import {stateAt} from './simulation-engine.js';
import {addEvent} from './event-engine.js';

const [A, B] = [5, 6];
const setup = setOwner(createSetup(7), A);
const spot = {x: .6, y: .4};
const pass = {type: 'pass', actor: A, target: spot, t: 0, dur: 1};
const add = (evs, e, mode = 'simulate') => addEvent(evs, e, mode, setup);

test('receive takes a loose ball: ball glides to the receiver, then follows them', () => {
  const evs = add(add([], pass).events, {type: 'receive', actor: B, t: 1, dur: .5}).events;
  assert.equal(stateAt(setup, evs, .9).ball.status, 'in-transit');
  assert.equal(stateAt(setup, evs, 1.25).ball.status, 'in-transit'); // gliding to B
  const s = stateAt(setup, evs, 2);
  assert.equal(s.ball.owner, B);
  assert.equal(s.ball.status, 'controlled');
});

test('receive while a player controls the ball is rejected in simulate and flagged in edit', () => {
  const r = add([], {type: 'receive', actor: B, t: 0, dur: .5});
  assert.ok(r.issues.some(i => i.code === 'bad-receive' && i.level === 'rejected'));
  assert.equal(r.events.length, 0);
  const e = add([], {type: 'receive', actor: B, t: 0, dur: .5}, 'edit');
  assert.ok(e.issues.some(i => i.code === 'bad-receive' && i.level === 'flagged'));
});
