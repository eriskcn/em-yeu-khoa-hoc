export function drawBall(ctx, px, r) {
  ctx.beginPath();
  ctx.ellipse(px.x, px.y, r * 0.6, r * 0.25, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(px.x, px.y, r * 0.6, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px.x, px.y, r * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = '#111827';
  ctx.fill();
}
