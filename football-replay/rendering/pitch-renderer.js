export const PAD = 28;

// Normalised (0..1) <-> canvas pixels. The only place that knows about padding.
export const toPx = (p, w, h) => ({x: PAD + p.x * (w - 2 * PAD), y: PAD + p.y * (h - 2 * PAD)});
export const toNorm = (q, w, h) => ({x: (q.x - PAD) / (w - 2 * PAD), y: (q.y - PAD) / (h - 2 * PAD)});
export const playerRadius = w => Math.max(10, w * 0.024);

export function drawPitch(ctx, w, h) {
  const x0 = PAD, y0 = PAD, pw = w - 2 * PAD, ph = h - 2 * PAD;
  ctx.fillStyle = '#166534';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 10; i += 2) {
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    ctx.fillRect(x0 + i * pw / 10, y0, pw / 10, ph);
  }
  ctx.strokeStyle = ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x0, y0, pw, ph);
  ctx.beginPath(); ctx.moveTo(x0 + pw / 2, y0); ctx.lineTo(x0 + pw / 2, y0 + ph); ctx.stroke();
  ctx.beginPath(); ctx.arc(x0 + pw / 2, y0 + ph / 2, ph * 0.14, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(x0 + pw / 2, y0 + ph / 2, 3, 0, Math.PI * 2); ctx.fill();
  const bw = pw * .14, bh = ph * .56, gw = ph * .12;
  ctx.strokeRect(x0, y0 + (ph - bh) / 2, bw, bh);
  ctx.strokeRect(x0 + pw - bw, y0 + (ph - bh) / 2, bw, bh);
  ctx.strokeRect(x0 - 6, y0 + (ph - gw) / 2, 6, gw);
  ctx.strokeRect(x0 + pw, y0 + (ph - gw) / 2, 6, gw);
}
