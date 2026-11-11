import test from 'node:test';
import assert from 'node:assert/strict';
import {createSetup, setOwner} from './match-state.js';
import {stateAt} from './simulation-engine.js';
import {addEvent, updateEvent} from './event-engine.js';
import {validateEvents} from './action-validator.js';
import {reorderPatch} from '../ui/event-editor.js';

// Issue #12 acceptance: A controls, passes to B, B receives, C overlaps, B passes to space (C runs onto it), C shoots.
const [A, B, C] = [5, 6, 4];
const setup = setOwner(createSetup(7), A); // step 1: A controls
const build = mode => [
  {type: 'pass', actor: A, target: B, t: 0, dur: 1}, // 2 (3: B receives = the pass arrives)
  {type: 'move', actor: C, to: {x: .8, y: .1}, t: 0.5, dur: 2}, // 4: overlap run, no ball
  {type: 'pass', actor: B, target: C, t: 1.2, dur: 1}, // 5: through ball into C's run
  {type: 'shot', actor: C, target: 'goal', t: 2.4, dur: 1} // 6-7
].reduce((evs, e) => {
  const r = addEvent(evs, e, mode, setup);
  assert.equal(r.issues.filter(i => i.level === 'rejected').length, 0, JSON.stringify(r.issues));
  return r.events;
}, []);

test('7-step example builds in simulate mode and plays out', () => {
  const evs = build('simulate');
  assert.equal(evs.length, 4);
  assert.equal(stateAt(setup, evs, 1.1).ball.owner, B);
  assert.equal(stateAt(setup, evs, 2.3).ball.owner, C);
  assert.equal(stateAt(setup, evs, 5).ball.status, 'loose');
});

test('actor, target and start edit in place via the editor patch path, re-validated', () => {
  const evs = build('simulate');
  const shotId = evs.find(e => e.type === 'shot').id;
  const passId = evs.find(e => e.actor === B).id;
  const moveId = evs.find(e => e.type === 'move').id;
  const p = reorderPatch(evs, moveId, 1); // start time, as the reorder buttons emit
  let r = updateEvent(evs, moveId, p, 'simulate', setup);
  assert.equal(r.events.find(e => e.id === moveId).t, p.t);
  r = updateEvent(r.events, moveId, {actor: 3}, 'simulate', setup); // actor edit: another player makes the run
  assert.equal(r.events.find(e => e.id === moveId).actor, 3);
  r = updateEvent(r.events, shotId, {target: {x: 1, y: .4}, t: 2.6}, 'simulate', setup); // target + start edit
  assert.equal(r.events.find(e => e.id === shotId).t, 2.6);
  assert.equal(r.events.length, 4);
  assert.deepEqual(validateEvents(setup, r.events, 'simulate').filter(i => i.level === 'rejected'), []);
  // retargeting the through ball leaves C without the ball for the shot: rejected, events unchanged
  assert.equal(updateEvent(evs, passId, {target: A}, 'simulate', setup).events, evs);
  const bad = updateEvent(evs, shotId, {actor: 3}, 'simulate', setup); // breaks possession: rejected, unchanged
  assert.equal(bad.events, evs);
  assert.equal(bad.issues.find(i => i.level === 'rejected').code, 'not-owner');
});
