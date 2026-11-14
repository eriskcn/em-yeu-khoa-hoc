import test from 'node:test';
import assert from 'node:assert/strict';
import {malformed} from './simulation-engine.js';
import {validateEvents} from './action-validator.js';
import {importScenario, exportScenario} from './scenario-io.js';
import {createAnnotations} from './annotation-state.js';
import {kickoff} from './scenarios.js';

const {setup} = kickoff(7);
const a = setup.players[1].id;
const mv = (id, t, dur) => ({id, type: 'move', actor: a, t, dur, to: {x: 0, y: 0}});

test('t and dur are capped at 600', () => {
  assert.match(malformed(setup, mv(1, 5000, 1)), /t must be <= 600/);
  assert.match(malformed(setup, mv(1, 0, 5000)), /dur must be <= 600/);
  assert.match(malformed(setup, {type: 'phase', kind: 'half-time', t: 5000}), /t must be <= 600/);
  assert.equal(malformed(setup, mv(1, 600, 1)), null);
});

test('overlapping moves by one actor are flagged', () => {
  const ov = evs => validateEvents(setup, evs, 'edit').filter(i => i.code === 'overlap');
  assert.deepEqual(ov([mv(1, 0, 2), mv(2, 1, 2)]).map(i => i.eventId), [2]);
  assert.equal(ov([mv(1, 0, 2), mv(2, 2, 2)]).length, 0);
});

test('import rejects bad setups', () => {
  const x = exportScenario({...kickoff(7), annotations: createAnnotations()});
  const bad = f => { const d = JSON.parse(x); f(d.setup); return () => importScenario(JSON.stringify(d)); };
  assert.throws(bad(s => { s.players[0] = null; }), /bad setup/);
  assert.throws(bad(s => { s.ball.owner = 99; }), /bad setup/);
  assert.throws(bad(s => { s.players[1].id = s.players[0].id; }), /bad setup/);
});
