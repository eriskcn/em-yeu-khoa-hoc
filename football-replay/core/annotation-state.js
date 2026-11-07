// Annotations: plain JSON in normalised 0..1 coordinates. All functions return new state.
const TYPES = {arrow: 2, line: 2, curve: 3, circle: 2, area: 3, text: 1, freehand: 2};
const COLOR = /^#[0-9a-fA-F]{6}$/;
const inUnit = n => Number.isFinite(n) && n >= 0 && n <= 1;
const timeOk = n => n === null || Number.isFinite(n);
const textOk = s => typeof s === 'string' && s.length <= 200;

export const createAnnotations = () => ({items: [], nextId: 1, views: []});

export function validateAnnotations(items) {
  if (!Array.isArray(items)) throw new Error('annotations must be an array');
  const ids = new Set();
  for (const a of items) {
    if (!a || typeof a !== 'object') throw new Error('bad annotation');
    if (!Number.isFinite(a.id) || ids.has(a.id)) throw new Error('bad or duplicate id');
    ids.add(a.id);
    const min = TYPES[a.type];
    if (!min) throw new Error(`bad type ${a.type}`);
    if (!Array.isArray(a.pts)) throw new Error('pts must be an array');
    const n = a.pts.length;
    const open = a.type === 'area' || a.type === 'freehand';
    if (open ? n < min : n !== min) throw new Error(`bad point count for ${a.type}`);
    if (a.type === 'freehand' && n > 300) throw new Error('too many points');
    if (!a.pts.every(p => p && inUnit(p.x) && inUnit(p.y))) throw new Error('point out of range');
    if (typeof a.color !== 'string' || !COLOR.test(a.color)) throw new Error('bad color');
    if ((a.type === 'text' || a.text !== undefined) && !textOk(a.text)) throw new Error('bad text');
    if (!timeOk(a.from) || !timeOk(a.to)) throw new Error('bad time window');
    if (a.from !== null && a.to !== null && a.from > a.to) throw new Error('from > to');
    if (typeof a.hidden !== 'boolean') throw new Error('bad hidden');
  }
}

export function addAnnotation(state, data) {
  const item = {color: '#facc15', from: null, to: null, hidden: false, ...data, id: state.nextId};
  validateAnnotations([item]);
  return {...state, items: [...state.items, item], nextId: state.nextId + 1};
}

export const removeAnnotation = (state, id) => ({...state, items: state.items.filter(a => a.id !== id)});
export const clearAnnotations = state => ({...state, items: []});

export function updateAnnotation(state, id, patch) {
  const items = state.items.map(a => a.id === id ? {...a, ...patch, id} : a);
  validateAnnotations(items);
  return {...state, items};
}

export const setHidden = (state, id, hidden) => updateAnnotation(state, id, {hidden});
export const setTimeWindow = (state, id, from, to) => updateAnnotation(state, id, {from, to});

export const visibleAt = (state, t) =>
  state.items.filter(a => !a.hidden && (a.from === null || t >= a.from) && (a.to === null || t <= a.to));

export function saveView(state, name, t = null) {
  if (!timeOk(t)) throw new Error('bad view time');
  const view = {name, t, hiddenIds: state.items.filter(a => a.hidden).map(a => a.id)};
  return {...state, views: [...state.views.filter(v => v.name !== name), view]};
}

export function applyView(state, name) {
  const view = state.views.find(v => v.name === name);
  if (!view) throw new Error(`no view ${name}`);
  return {...state, items: state.items.map(a => ({...a, hidden: view.hiddenIds.includes(a.id)}))};
}

export const listViews = state => state.views.map(v => v.name);

export const serializeAnnotations = state =>
  JSON.stringify({items: state.items, nextId: state.nextId, views: state.views});

export function restoreAnnotations(json) {
  const d = JSON.parse(json);
  validateAnnotations(d.items);
  const viewOk = v => v && typeof v.name === 'string' && timeOk(v.t ?? null) && Array.isArray(v.hiddenIds) && v.hiddenIds.every(Number.isFinite);
  if (!Array.isArray(d.views) || !d.views.every(viewOk)) throw new Error('bad views');
  const nextId = Math.max(Number.isFinite(d.nextId) ? d.nextId : 0, 1 + Math.max(0, ...d.items.map(a => a.id)));
  return {items: d.items, nextId, views: d.views};
}
