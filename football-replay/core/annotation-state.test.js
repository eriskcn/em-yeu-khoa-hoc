import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAnnotations, addAnnotation, removeAnnotation, clearAnnotations, updateAnnotation, setHidden,
  setTimeWindow, visibleAt, validateAnnotations, serializeAnnotations, restoreAnnotations, saveView,
  applyView, listViews,
} from './annotation-state.js';
import {createDrawingController} from '../interaction/drawing-controller.js';
import {toPx} from '../rendering/pitch-renderer.js';

const arrow = {type: 'arrow', pts: [{x: .1, y: .1}, {x: .5, y: .5}]};
const text = {type: 'text', pts: [{x: .5, y: .5}], text: 'hi'};

test('add assigns id and defaults, does not mutate', () => {
  const s0 = createAnnotations();
  const s1 = addAnnotation(s0, arrow);
  assert.equal(s0.items.length, 0);
  assert.deepEqual(s1.items[0], {...arrow, id: 1, color: '#facc15', from: null, to: null, hidden: false});
});

test('ids stay unique after remove; clear empties', () => {
  let s = addAnnotation(addAnnotation(createAnnotations(), arrow), arrow);
  s = addAnnotation(removeAnnotation(s, 2), arrow);
  assert.deepEqual(s.items.map(a => a.id), [1, 3]);
  assert.equal(clearAnnotations(s).items.length, 0);
});

test('update patches and keeps id; invalid patch throws', () => {
  const s = addAnnotation(createAnnotations(), arrow);
  assert.equal(updateAnnotation(s, 1, {color: '#ffffff', id: 9}).items[0].id, 1);
  assert.throws(() => updateAnnotation(s, 1, {color: 'red'}));
});

test('visibleAt honours hidden and time windows', () => {
  let s = addAnnotation(addAnnotation(addAnnotation(createAnnotations(), arrow), arrow), arrow);
  s = setTimeWindow(s, 2, 5, 10);
  s = setHidden(s, 3, true);
  assert.deepEqual(visibleAt(s, 0).map(a => a.id), [1]);
  assert.deepEqual(visibleAt(s, 5).map(a => a.id), [1, 2]);
  assert.deepEqual(visibleAt(s, 10).map(a => a.id), [1, 2]);
  assert.deepEqual(visibleAt(s, 10.1).map(a => a.id), [1]);
  assert.throws(() => setTimeWindow(s, 2, 9, 3));
});

test('validate rejects each bad case', () => {
  const ok = {...arrow, id: 1, color: '#aabbcc', from: null, to: null, hidden: false};
  validateAnnotations([ok]);
  const bad = [
    {type: 'zigzag'},
    {pts: [ok.pts[0]]},
    {type: 'curve'},
    {type: 'area', pts: ok.pts},
    {type: 'freehand', pts: Array(301).fill({x: .1, y: .1})},
    {pts: [{x: 2, y: 0}, ok.pts[1]]},
    {pts: [{x: NaN, y: 0}, ok.pts[1]]},
    {color: 'red'},
    {color: '#abc'},
    {type: 'text', pts: [ok.pts[0]]},
    {type: 'text', pts: [ok.pts[0]], text: 'x'.repeat(201)},
    {from: 5, to: 1},
    {from: undefined},
    {hidden: 'no'},
    {id: 'a'},
  ];
  for (const b of bad) assert.throws(() => validateAnnotations([{...ok, ...b}]), JSON.stringify(b));
  assert.throws(() => validateAnnotations([ok, ok]));
});

test('serialize/restore round trip', () => {
  let s = addAnnotation(addAnnotation(createAnnotations(), arrow), text);
  s = saveView(setHidden(s, 1, true), 'v');
  assert.deepEqual(restoreAnnotations(serializeAnnotations(s)), s);
});

test('bad restore throws', () => {
  const s = addAnnotation(createAnnotations(), arrow);
  const d = JSON.parse(serializeAnnotations(s));
  d.items[0].color = 'nope';
  assert.throws(() => restoreAnnotations(JSON.stringify(d)));
  assert.throws(() => restoreAnnotations('{'));
});

test('saved view keeps optional time', () => {
  const s = addAnnotation(createAnnotations(), arrow);
  assert.equal(saveView(s, 'a').views[0].t, null);
  const s2 = saveView(s, 'a', 2.5);
  assert.equal(restoreAnnotations(serializeAnnotations(s2)).views[0].t, 2.5);
  assert.throws(() => saveView(s, 'a', NaN));
});

test('saved views apply hidden flags', () => {
  let s = addAnnotation(addAnnotation(createAnnotations(), arrow), arrow);
  s = saveView(setHidden(s, 1, true), 'only2');
  s = saveView(setHidden(setHidden(s, 1, false), 2, true), 'only1');
  assert.deepEqual(listViews(s), ['only2', 'only1']);
  assert.deepEqual(applyView(s, 'only2').items.map(a => a.hidden), [true, false]);
  assert.deepEqual(applyView(s, 'only1').items.map(a => a.hidden), [false, true]);
  assert.throws(() => applyView(s, 'none'));
});

// drawing-controller: canvas 400x300
const W = 400, H = 300;
function rig(tool) {
  const out = {commits: [], drafts: [], texts: []};
  const c = createDrawingController({
    getTool: () => tool, getSize: () => ({w: W, h: H}),
    onCommit: d => out.commits.push(d), onDraft: d => out.drafts.push(d), onTextRequest: p => out.texts.push(p),
  });
  return {c, out};
}
const px = (x, y) => toPx({x, y}, W, H);
const drag = (c, a, b) => { assert.equal(c.down(a), true); c.move(b); c.up(); };

test('drag tools commit, short drags are ignored', () => {
  const {c, out} = rig('arrow');
  drag(c, px(.2, .2), px(.6, .2));
  assert.equal(out.commits.length, 1);
  assert.deepEqual(out.commits[0].pts.map(p => +p.x.toFixed(3)), [.2, .6]);
  drag(c, px(.2, .2), {x: px(.2, .2).x + 3, y: px(.2, .2).y});
  assert.equal(out.commits.length, 1);
  assert.equal(out.drafts.at(-1), null);
});

test('curve control is offset perpendicular by 20% of length', () => {
  const {c, out} = rig('curve');
  const a = {x: 100, y: 100}, b = {x: 200, y: 100};
  drag(c, a, b);
  const q = out.commits[0].pts.map(p => toPx(p, W, H));
  assert.ok(Math.abs(q[1].x - 150) < 1e-6 && Math.abs(q[1].y - 120) < 1e-6);
});

test('points are clamped to the pitch', () => {
  const {c, out} = rig('line');
  drag(c, {x: 50, y: 50}, {x: 5000, y: -5000});
  assert.deepEqual(out.commits[0].pts[1], {x: 1, y: 0});
});

test('freehand drops close points', () => {
  const {c, out} = rig('freehand');
  c.down({x: 100, y: 100});
  for (const x of [100.5, 101, 120, 120.5, 140]) c.move({x, y: 100});
  c.up();
  assert.equal(out.commits[0].pts.length, 3);
});

test('area closes on first vertex and on double click', () => {
  const {c, out} = rig('area');
  for (const p of [px(.2, .2), px(.6, .2), px(.4, .6)]) assert.equal(c.down(p), false);
  c.down({x: px(.2, .2).x + 5, y: px(.2, .2).y});
  assert.equal(out.commits[0].pts.length, 3);
  c.down(px(.2, .2)); c.down(px(.6, .2)); c.down(px(.4, .6)); c.down(px(.4, .6));
  assert.equal(out.commits.length, 2);
  assert.equal(out.commits[1].pts.length, 3);
});

test('area cancel discards; two vertices never commit', () => {
  const {c, out} = rig('area');
  c.down(px(.2, .2)); c.down(px(.6, .2)); c.down(px(.2, .2));
  assert.equal(out.commits.length, 0);
  c.cancel();
  assert.equal(out.drafts.at(-1), null);
});

const P = (x, y) => ({x, y});
const kinds = {
  defline: {type: 'defline', pts: [P(.3, .1), P(.3, .9)]},
  press: {type: 'press', pts: [P(.1, .1), P(.5, .1), P(.5, .5), P(.1, .5)], color: '#ef4444'},
  lane: {type: 'lane', pts: [P(.1, .1), P(.6, .4)], width: .03},
};

test('new kinds validate and round trip', () => {
  let s = createAnnotations();
  for (const k of Object.values(kinds)) s = addAnnotation(s, k);
  assert.deepEqual(restoreAnnotations(serializeAnnotations(s)), s);
  const bad = [
    {...kinds.defline, pts: [P(.1, .1), P(.5, .5)]},
    {...kinds.defline, pts: [P(.1, .1)]},
    {...kinds.press, pts: kinds.press.pts.slice(0, 2)},
    {...kinds.lane, width: 0},
    {...kinds.lane, width: 'x'},
    {...kinds.lane, pts: [P(.1, .1), P(2, .4)]},
  ];
  for (const b of bad) assert.throws(() => addAnnotation(createAnnotations(), b), JSON.stringify(b));
});

test('controller: defline snaps, lane has width, press closes with preset colour', () => {
  let r = rig('defline');
  drag(r.c, px(.3, .2), px(.5, .25));
  assert.equal(r.out.commits[0].pts[1].y, r.out.commits[0].pts[0].y);
  addAnnotation(createAnnotations(), r.out.commits[0]);
  r = rig('lane');
  drag(r.c, px(.2, .2), px(.6, .5));
  assert.ok(r.out.commits[0].width > 0);
  addAnnotation(createAnnotations(), r.out.commits[0]);
  r = rig('press');
  r.c.down(px(.2, .2)); r.c.down(px(.6, .2)); r.c.down(px(.6, .6)); r.c.down(px(.2, .2));
  assert.equal(r.out.commits[0].type, 'press');
  addAnnotation(createAnnotations(), r.out.commits[0]);
});

test('text click requests text', () => {
  const {c, out} = rig('text');
  assert.equal(c.down(px(.5, .5)), false);
  assert.equal(out.texts.length, 1);
});
