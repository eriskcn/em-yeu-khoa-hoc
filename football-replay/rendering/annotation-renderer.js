// Pure drawing of annotations. Points are normalised; toPx maps them to the pitch.
import {toPx} from './pitch-renderer.js';
import {drawPlayer} from './player-renderer.js';

function head(ctx, from, to, size) {
  const a = Math.atan2(to.y - from.y, to.x - from.x);
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - size * Math.cos(a - 0.45), to.y - size * Math.sin(a - 0.45));
  ctx.lineTo(to.x - size * Math.cos(a + 0.45), to.y - size * Math.sin(a + 0.45));
  ctx.closePath();
  ctx.fill();
}

function path(ctx, q) {
  ctx.beginPath();
  q.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
}

function shape(ctx, a, q, w) {
  const size = Math.max(10, w * 0.02);
  ctx.strokeStyle = ctx.fillStyle = a.color;
  if (a.type === 'arrow' || a.type === 'line') {
    path(ctx, q); ctx.stroke();
    if (a.type === 'arrow') head(ctx, q[0], q[1], size);
  } else if (a.type === 'curve' && q.length === 3) {
    ctx.beginPath(); ctx.moveTo(q[0].x, q[0].y); ctx.quadraticCurveTo(q[1].x, q[1].y, q[2].x, q[2].y); ctx.stroke();
    head(ctx, q[1], q[2], size);
  } else if (a.type === 'circle' && q.length === 2) {
    ctx.beginPath(); ctx.arc(q[0].x, q[0].y, Math.hypot(q[1].x - q[0].x, q[1].y - q[0].y), 0, Math.PI * 2);
    ctx.fillStyle = a.color + '40'; ctx.fill(); ctx.stroke();
  } else if (a.type === 'area') {
    path(ctx, q); ctx.closePath(); ctx.fillStyle = a.color + '40'; ctx.fill();
    ctx.setLineDash([8, 5]); ctx.stroke();
  } else if (a.type === 'defline' && q.length === 2) {
    ctx.setLineDash([12, 8]); path(ctx, q); ctx.stroke();
  } else if (a.type === 'press') {
    path(ctx, q); ctx.closePath(); ctx.fillStyle = a.color + '55'; ctx.fill(); ctx.stroke();
  } else if (a.type === 'lane' && q.length === 2) {
    const lw = (a.width ?? 0.02) * w;
    ctx.save(); ctx.globalAlpha = 0.35; ctx.lineWidth = lw; ctx.lineCap = 'butt'; path(ctx, q); ctx.stroke(); ctx.restore();
    path(ctx, q); ctx.stroke(); head(ctx, q[0], q[1], size);
  } else if (a.type === 'freehand') {
    path(ctx, q); ctx.stroke();
  } else if (a.type === 'text' && a.text) {
    const px = Math.max(13, w * 0.022);
    ctx.font = `bold ${px}px sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,.7)';
    ctx.fillRect(q[0].x - 6, q[0].y - px / 2 - 4, ctx.measureText(a.text).width + 12, px + 8);
    ctx.fillStyle = a.color; ctx.fillText(a.text, q[0].x, q[0].y);
  }
}

function draw(ctx, w, h, a, dashed, selected) {
  const q = a.pts.map(p => toPx(p, w, h));
  if (!q.length) return;
  const item = {...a, color: a.color || '#facc15'};
  ctx.save();
  ctx.lineWidth = 3; ctx.lineCap = ctx.lineJoin = 'round';
  if (selected) {
    ctx.save(); ctx.lineWidth = 7; shape(ctx, {...item, color: '#ffffff'}, q, w); ctx.restore();
  }
  if (dashed) ctx.setLineDash([6, 5]);
  shape(ctx, item, q, w);
  ctx.restore();
}

export function drawAnnotations(ctx, w, h, items, {t, selectedId} = {}) {
  for (const a of items) {
    if (a.hidden) continue;
    if (t !== undefined && ((a.from !== null && t < a.from) || (a.to !== null && t > a.to))) continue;
    draw(ctx, w, h, a, false, a.id === selectedId);
  }
}

// Translucent copy of a player list ({x, y, team, num}) to compare with the live positions.
export function drawGhost(ctx, w, h, players, {alpha = 0.35, radius = Math.max(8, w * 0.016), colors = {}} = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  for (const p of players) drawPlayer(ctx, toPx(p, w, h), radius, colors[p.team] ?? '#94a3b8', p.num);
  ctx.restore();
}

export const drawDraft =(ctx, w, h, draft) => { if (draft) draw(ctx, w, h, draft, true, false); };
