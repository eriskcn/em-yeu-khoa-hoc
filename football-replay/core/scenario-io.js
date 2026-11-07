import {FORMATS} from './match-rules.js';
import {createSetup} from './match-state.js';
import {validateAnnotations} from './annotation-state.js';

const num = n => Number.isFinite(n);
const isObj = o => o && typeof o === 'object' && !Array.isArray(o);
const pt = q => isObj(q) && num(q.x) && num(q.y);

export const exportScenario = ({setup, events, annotations}) =>
  JSON.stringify({v: 2, setup, events, annotations: {items: annotations.items, nextId: annotations.nextId, views: annotations.views}});

// Each bad item is skipped with a warning instead of failing the whole load.
function buildAnnotations(items, nextId, views, warnings) {
  const kept = [];
  const ids = new Set();
  (Array.isArray(items) ? items : []).forEach((a, i) => {
    try {
      validateAnnotations([a]);
      if (ids.has(a.id)) throw new Error('duplicate id');
      ids.add(a.id);
      kept.push(a);
    } catch (e) {
      warnings.push(`annotation ${i} skipped: ${e.message}`);
    }
  });
  const list = Array.isArray(views) ? views : [];
  const goodViews = list.filter(v => isObj(v) && typeof v.name === 'string' && (v.t == null || num(v.t)) &&
    Array.isArray(v.hiddenIds) && v.hiddenIds.every(num));
  if (goodViews.length !== list.length) warnings.push('some saved views were skipped');
  return {
    items: kept,
    nextId: Math.max(num(nextId) ? nextId : 0, 1 + Math.max(0, ...ids)),
    views: goodViews.map(v => ({name: v.name, t: v.t ?? null, hiddenIds: v.hiddenIds}))
  };
}

function keepEvents(list, warnings) {
  if (!Array.isArray(list)) throw new Error('events must be an array');
  return list.filter((e, i) => {
    const ok = isObj(e) && num(e.id) && num(e.t) && typeof e.type === 'string';
    if (!ok) warnings.push(`event ${i} skipped: malformed`);
    return ok;
  });
}

function checkSetup(s) {
  if (!isObj(s) || !FORMATS[s.format] || !Array.isArray(s.players) || !isObj(s.ball)) throw new Error('bad setup');
  if (s.players.length !== FORMATS[s.format].formation.length * 2) throw new Error('bad setup: player count');
  if (!num(s.ball.x) || !num(s.ball.y)) throw new Error('bad setup: ball');
  return s;
}

const legacyShape = h => {
  if (!isObj(h)) return null;
  if (h.type === 'area' && Array.isArray(h.pts)) return {type: 'area', pts: h.pts};
  if (!pt(h.a) || !pt(h.b)) return null;
  const {a, b} = h;
  if (h.type === 'area') return {type: 'area', pts: [{x: a.x, y: a.y}, {x: b.x, y: a.y}, {x: b.x, y: b.y}, {x: a.x, y: b.y}]};
  if (h.type === 'arrow' || h.type === 'line') return {type: h.type, pts: [{x: a.x, y: a.y}, {x: b.x, y: b.y}]};
  return null;
};

// Legacy PoC scenario (v1: mode, kfs, events, shapes). Keyframes are dropped; setup is the default layout for the mode.
function fromLegacy(d, warnings) {
  if (!FORMATS[d.mode]) throw new Error(`unsupported legacy mode ${d.mode}`);
  if (Array.isArray(d.kfs) && d.kfs.length) warnings.push('keyframes are not supported and were ignored');
  const events = keepEvents(d.events ?? [], warnings).map(({endKf, bend, lift, ...e}) => e);
  const items = [];
  (Array.isArray(d.shapes) ? d.shapes : []).forEach((h, i) => {
    const s = legacyShape(h);
    if (s) items.push({color: '#facc15', from: null, to: null, hidden: false, ...s, id: items.length + 1});
    else warnings.push(`legacy shape ${i} skipped: unsupported or malformed`);
  });
  return {setup: createSetup(Number(d.mode)), events, annotations: buildAnnotations(items, 0, [], warnings), warnings};
}

export function importScenario(text) {
  let d;
  try { d = JSON.parse(text); } catch { throw new Error('scenario is not valid JSON'); }
  if (!isObj(d)) throw new Error('scenario must be a JSON object');
  const warnings = [];
  if (d.v === 1) return fromLegacy(d, warnings);
  if (d.v !== 2) throw new Error(`unsupported scenario version ${d.v}`);
  const setup = checkSetup(d.setup);
  const events = keepEvents(d.events, warnings);
  const a = isObj(d.annotations) ? d.annotations : {};
  return {setup, events, annotations: buildAnnotations(a.items, a.nextId, a.views, warnings), warnings};
}
