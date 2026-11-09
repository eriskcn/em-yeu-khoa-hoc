import test from 'node:test';
import assert from 'node:assert/strict';
import {exportScenario, importScenario} from './scenario-io.js';
import {kickoff} from './scenarios.js';
import {createAnnotations, addAnnotation} from './annotation-state.js';

const pts = [{x: .1, y: .1}, {x: .5, y: .5}];
const make = () => {
  const {setup, events} = kickoff(7);
  let annotations = addAnnotation(createAnnotations(), {type: 'arrow', pts});
  annotations = addAnnotation(annotations, {type: 'text', pts: [pts[0]], text: 'hi'});
  return {setup, events, annotations};
};

test('round trip', () => {
  const s = make();
  const {warnings, ...r} = importScenario(exportScenario(s));
  assert.deepEqual(r, s);
  assert.deepEqual(warnings, []);
});

test('legacy rectangle area loads as polygon, keyframes ignored with warning', () => {
  const legacy = {v: 1, mode: '7', colA: '#ff0000', colB: '#0000ff', evSeq: 1,
    kfs: [{t: 0, p: []}], events: [],
    shapes: [{type: 'area', a: {x: .2, y: .2}, b: {x: .6, y: .4}}]};
  const r = importScenario(JSON.stringify(legacy));
  assert.equal(r.annotations.items.length, 1);
  assert.equal(r.annotations.items[0].type, 'area');
  assert.equal(r.annotations.items[0].pts.length, 4);
  assert.equal(r.setup.format, 7);
  assert.ok(r.warnings.some(w => /keyframes/.test(w)));
});

test('one corrupt annotation is skipped with a warning', () => {
  const d = JSON.parse(exportScenario(make()));
  d.annotations.items[0].color = 'red';
  const r = importScenario(JSON.stringify(d));
  assert.equal(r.annotations.items.length, 1);
  assert.equal(r.warnings.length, 1);
});

test('garbage and bad versions throw', () => {
  assert.throws(() => importScenario('not json'), /not valid JSON/);
  assert.throws(() => importScenario('[1]'), /object/);
  assert.throws(() => importScenario('{"v":9}'), /version/);
  assert.throws(() => importScenario('{"v":2,"setup":{}}'), /setup/);
});

test('events with out-of-range t/dur or duplicate id are skipped with a warning', () => {
  const {setup} = make();
  const ev = (id, extra) => ({id, type: 'move', t: 1, ...extra});
  const r = importScenario(JSON.stringify({v: 2, setup, events: [ev(1), ev(2, {t: 1e6}), ev(3, {dur: '1e9'}), ev(1), ev(4, {dur: 5})]}));
  assert.deepEqual(r.events.map(e => e.id), [1, 4]);
  assert.equal(r.warnings.length, 3);
});
