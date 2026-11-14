import test from 'node:test';
import assert from 'node:assert/strict';
import {createSetup, setOwner} from './match-state.js';
import {stateAt, duration} from './simulation-engine.js';
import {addEvent, updateEvent, removeEvent} from './event-engine.js';
import {validateEvents} from './action-validator.js';

const setup = setOwner(createSetup(7), 0);
const pass = (id, actor, target, t, extra = {}) => ({id, type: 'pass', actor, target, t, dur: 1, ...extra});
const chain = [
  pass(1, 0, 1, 0), pass(2, 1, 2, 1, {bend: .1, lift: .05}), pass(3, 2, 3, 2),
  {id: 4, type: 'move', actor: 3, to: {x: .6, y: .2}, t: 0, dur: 4}
];

test('setOwner places the ball on the player; unknown id throws', () => {
  const s = setOwner(createSetup(7), 3);
  assert.deepEqual([s.ball.x, s.ball.y, s.ball.owner], [s.players[3].x, s.players[3].y, 3]);
  assert.throws(() => setOwner(s, 99));
});

test('ball is continuous across a pass chain A->B->C->D', () => {
  let prev = stateAt(setup, chain, 0).ball;
  for (let t = .02; t <= duration(chain); t += .02) {
    const b = stateAt(setup, chain, t).ball;
    assert.ok(Math.hypot(b.x - prev.x, b.y - prev.y) <= .05, `jump at t=${t}`);
    prev = b;
  }
  const end = stateAt(setup, chain, 3.5);
  assert.equal(end.ball.owner, 3);
  assert.equal(end.ball.status, 'controlled');
  assert.equal(stateAt(setup, chain, .5).ball.status, 'in-transit');
});

test('non-owner pass: rejected in simulate, flagged in edit, manual flagged and teleports', () => {
  const bad = pass(1, 5, 6, 0);
  const r = addEvent([], bad, 'simulate', setup);
  assert.deepEqual(r.events, []);
  assert.equal(r.issues[0].level, 'rejected');
  const e = addEvent([], bad, 'edit', setup);
  assert.equal(e.events.length, 1);
  assert.equal(e.issues[0].level, 'flagged');
  const m = validateEvents(setup, [pass(1, 5, 6, 0, {manual: true})], 'simulate');
  assert.deepEqual(m.map(i => i.level), ['flagged']);
  assert.equal(stateAt(setup, [pass(1, 5, 6, 0, {manual: true})], 2).ball.owner, 6);
});

test('overlapping ball events are rejected in simulate', () => {
  const r = addEvent([pass(1, 0, 1, 0)], pass(2, 1, 2, .5), 'simulate', setup);
  assert.equal(r.events.length, 1);
  assert.equal(r.issues[0].code, 'overlap');
});

test('pass to an opponent: rejected in simulate, flagged in edit', () => {
  assert.equal(validateEvents(setup, [pass(1, 0, 8, 0)], 'simulate')[0].level, 'rejected');
  assert.equal(validateEvents(setup, [pass(1, 0, 8, 0)], 'edit')[0].level, 'flagged');
});

test('removing an event leaves no ghost ball', () => {
  const rest = removeEvent(chain, 3);
  const s = stateAt(setup, rest, 10);
  assert.equal(s.ball.owner, 2);
  assert.deepEqual([s.ball.x, s.ball.y], [s.players[2].x, s.players[2].y]);
  assert.equal(stateAt(setup, removeEvent(chain, 1), 10).ball.owner, 0);
});

test('shot ends loose at goal; point pass ends loose there; won tackle swaps owner', () => {
  const s = stateAt(setup, [{id: 1, type: 'shot', actor: 0, target: 'goal', t: 0, dur: 1}], 2).ball;
  assert.deepEqual([s.x, s.y, s.status, s.owner], [1, .5, 'loose', null]);
  const p = stateAt(setup, [pass(1, 0, {x: .3, y: .3}, 0)], 2).ball;
  assert.deepEqual([p.x, p.y, p.status], [.3, .3, 'loose']);
  const tk = {id: 1, type: 'tackle', actor: 7, target: 0, t: 0, dur: 1, won: true};
  assert.equal(stateAt(setup, [tk], 2).ball.owner, 7);
  assert.equal(stateAt(setup, [{...tk, won: false}], 2).ball.owner, 0);
});

test('stateAt is deterministic for random call order', () => {
  const times = [0, .3, 1, 1.5, 2.2, 3, 3.9, 10];
  const expected = times.map(t => JSON.stringify(stateAt(setup, chain, t)));
  for (let i = 0; i < 200; i++) {
    const k = Math.floor(Math.random() * times.length);
    assert.equal(JSON.stringify(stateAt(setup, chain, times[k])), expected[k]);
  }
});

test('updateEvent changing t reorders; ids are assigned; input is not mutated', () => {
  const before = JSON.stringify(chain);
  const u = updateEvent(chain, 4, {t: 1.5}, 'simulate', setup);
  assert.deepEqual(u.events.map(e => e.id), [1, 2, 4, 3]);
  assert.equal(JSON.stringify(chain), before);
  const a = addEvent(chain, {type: 'move', actor: 9, to: {x: .5, y: .5}, t: 0, dur: 1}, 'simulate', setup);
  assert.equal(a.events.find(e => e.t === 0 && e.actor === 9).id, 5);
});

test('invalid input is rejected and never corrupts', () => {
  const bad = [{type: 'fly', actor: 0, t: 0, dur: 1}, {...pass(0, 0, 1, 0), dur: 0}, {...pass(0, 0, 1, 0), actor: 99}, {...pass(0, 0, 1, 0), t: NaN}];
  for (const ev of bad) {
    const r = addEvent(chain, ev, 'edit', setup);
    assert.equal(r.events, chain);
    assert.equal(r.issues[0].level, 'rejected');
  }
  assert.equal(updateEvent(chain, 99, {t: 1}, 'edit', setup).issues[0].code, 'not-found');
  assert.equal(addEvent(chain, {...pass(1, 0, 1, 9)}, 'edit', setup).issues[0].code, 'duplicate-id');
  assert.throws(() => addEvent(chain, pass(9, 0, 1, 9)));
  assert.doesNotThrow(() => stateAt(setup, [null, {type: 'x'}, ...chain], 1));
});
