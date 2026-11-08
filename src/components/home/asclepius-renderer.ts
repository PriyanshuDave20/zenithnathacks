import type { Stage } from "./heartbeat-geometry";

type Palette = { blue: string; dark: string; white: string; mist: string; navy: string };

/** A plain, organically tapered physician's staff, with restrained timber tones distinct from the blue serpent. */
export function drawStaff(ctx: CanvasRenderingContext2D, stage: Stage, alpha: number) {
  if (alpha <= 0) return;
  const { x, top, height } = stage;
  ctx.save();
  ctx.translate(x, top - 16);
  ctx.globalAlpha = alpha;
  const h = height + 34;
  const outline = new Path2D();
  outline.moveTo(-3.8, 0);
  outline.bezierCurveTo(-8, 1, -8.8, 7, -7.5, 17);
  outline.bezierCurveTo(-6.4, h * .21, -5.7, h * .34, -5.1, h * .49);
  outline.bezierCurveTo(-6.5, h * .57, -3.5, h * .76, -3.2, h - 5);
  outline.quadraticCurveTo(-2, h + 1, 1.8, h);
  outline.quadraticCurveTo(4.5, h - 1, 4, h - 7);
  outline.bezierCurveTo(3, h * .74, 5.7, h * .59, 5.2, h * .43);
  outline.bezierCurveTo(4, h * .27, 6.9, h * .16, 7, 15);
  outline.bezierCurveTo(8.5, 5, 4.6, -2, -3.8, 0);
  outline.closePath();
  const finish = ctx.createLinearGradient(-9, 0, 9, 0);
  finish.addColorStop(0, "#584737");
  finish.addColorStop(.2, "#927658");
  finish.addColorStop(.42, "#bda17e");
  finish.addColorStop(.57, "#d2ba97");
  finish.addColorStop(.75, "#a88a65");
  finish.addColorStop(1, "#66503b");
  ctx.fillStyle = finish;
  ctx.fill(outline);
  ctx.strokeStyle = "#b99b76";
  ctx.lineWidth = .7;
  ctx.stroke(outline);
  ctx.clip(outline);
  // Long, irregular fibres give the shaft a natural grain rather than a metal-pipe finish.
  for (let n = 0; n < 5; n++) {
    const sx = -5.5 + n * 2.5;
    ctx.globalAlpha = alpha * (n % 2 ? .27 : .4);
    ctx.strokeStyle = n % 2 ? "#f1dfc2" : "#493728";
    ctx.lineWidth = n % 2 ? .55 : .7;
    ctx.beginPath();
    ctx.moveTo(sx, 18 + n * 6);
    ctx.bezierCurveTo(sx - 2.5, h * .24, sx + 2, h * .34, sx - .6, h * .48);
    ctx.bezierCurveTo(sx - 2, h * .65, sx + 1.5, h * .77, sx * .48, h - 10);
    ctx.stroke();
  }
  // A small healed knot and grain splitting around it; no ornamental finial.
  const knotY = h * .35;
  ctx.globalAlpha = alpha * .5;
  ctx.strokeStyle = "#5b4030";
  ctx.lineWidth = .75;
  ctx.beginPath();
  ctx.ellipse(-.6, knotY, 2.1, 5.5, -.13, 0, Math.PI * 2);
  ctx.ellipse(-.6, knotY, .7, 2.8, -.13, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = alpha * .28;
  ctx.beginPath();
  ctx.moveTo(-2, knotY - 17);
  ctx.bezierCurveTo(-5.5, knotY - 8, -5.5, knotY + 9, -2, knotY + 21);
  ctx.stroke();
  ctx.restore();
}

/** A smooth, non-triangular serpent head, with a distinct brow, jaw and slender neck. */
export function drawSnakeHead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, alpha: number, colors: Palette) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;
  const surface = ctx.createLinearGradient(0, -8, 0, 8);
  surface.addColorStop(0, colors.mist);
  surface.addColorStop(.28, colors.blue);
  surface.addColorStop(.78, colors.blue);
  surface.addColorStop(1, colors.dark);
  ctx.fillStyle = surface;
  ctx.strokeStyle = colors.dark;
  ctx.lineWidth = .65;
  ctx.beginPath();
  ctx.moveTo(-9, -4);
  ctx.bezierCurveTo(-4, -4.6, -3, -8, 3, -7.4);
  ctx.bezierCurveTo(9, -7, 14, -3.7, 14.5, -.8);
  ctx.bezierCurveTo(15, 1.3, 11, 4.8, 5, 6.2);
  ctx.bezierCurveTo(-1, 7.4, -3, 4.5, -9, 4.3);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.strokeStyle = colors.mist;
  ctx.globalAlpha = alpha * .65;
  ctx.lineWidth = .85;
  ctx.beginPath(); ctx.moveTo(-1, -5.7); ctx.quadraticCurveTo(5, -6.5, 10.5, -2.8); ctx.stroke();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colors.navy;
  ctx.beginPath(); ctx.ellipse(6.6, -2.7, 1.45, 1.25, -.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = colors.white;
  ctx.beginPath(); ctx.arc(6.9, -3.1, .42, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = colors.dark;
  ctx.lineWidth = .65;
  ctx.beginPath(); ctx.moveTo(13, .7); ctx.quadraticCurveTo(9, 3.3, 3.5, 3.1); ctx.stroke();
  ctx.fillStyle = colors.dark;
  ctx.beginPath(); ctx.arc(12, -1.3, .55, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
