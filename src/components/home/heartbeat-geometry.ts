export type Point = { x: number; y: number; z: number };
export type Stage = { x: number; top: number; height: number; radius: number; dockX: number; dockY: number; sway?: number };

export const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export function ease(a: number, b: number, n: number) {
  const t = clamp((n - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** Parametric length of the journey: coil 0-1, unwind 1-(1+rise), then rest at the header dock. */
export const ROUTE = 1.6;

/**
 * One continuous corkscrew, smooth in position and heading everywhere. The climb never pauses:
 * above the crown the same rotation carries on while the radius loosens to nothing, so the snake
 * unscrews itself into a straight vertical line and arrives at the header heading straight up.
 * There is no separate orbit or launch curve, so nothing can kink, reverse or circle empty air.
 */
export function journeyPoint(distance: number, stage: Stage): Point {
  const { x, top, height, radius, dockX, dockY, sway = 0 } = stage;
  const rise = clamp((top - dockY) / height, 0.08, 0.45);
  if (distance <= 1) {
    // `sway` is zero at both ends so the coil stays joined to the foot and the unwind.
    const angle = distance * Math.PI * 6 + sway * Math.sin(distance * Math.PI);
    return { x: x + Math.sin(angle) * radius, y: top + height * (1 - distance), z: Math.cos(angle) };
  }
  if (distance >= 1 + rise) return { x: dockX, y: dockY, z: 1 };
  const u = (distance - 1) / rise;
  const loosen = u * u * (3 - 2 * u);
  const angle = distance * Math.PI * 6;
  return {
    x: x + Math.sin(angle) * radius * (1 - loosen),
    y: mix(top, dockY, u),
    z: mix(Math.cos(angle), 1, loosen),
  };
}

/** Clockwise monitor route: the staff's header entry → rounded top-right corner → right edge. */
export function monitorPoint(position: number, startX: number, top: number, width: number, height: number) {
  const right = width - 12;
  const radius = 18;
  const horizontal = Math.max(0, right - radius - startX);
  const arc = Math.PI * radius / 2;
  const vertical = Math.max(0, height - 24 - top - radius);
  const total = horizontal + arc + vertical;
  const distance = clamp(position) * total;
  if (distance <= horizontal) return { x: startX + distance, y: top, nx: 0, ny: -1 };
  if (distance <= horizontal + arc) {
    const angle = (distance - horizontal) / radius - Math.PI / 2;
    return { x: right - radius + Math.cos(angle) * radius, y: top + radius + Math.sin(angle) * radius, nx: Math.cos(angle), ny: Math.sin(angle) };
  }
  return { x: right, y: top + radius + distance - horizontal - arc, nx: 1, ny: 0 };
}

/** P/Q/R/S/T profile, centred on the progress marker. */
export function heartbeat(x: number) {
  const keys = [[-1, 0], [-0.7, 0], [-0.56, 0.18], [-0.4, 0], [-0.24, -0.22], [0, 1], [0.17, -0.55], [0.32, 0], [0.52, 0.14], [0.7, 0], [1, 0]];
  for (let i = 1; i < keys.length; i++) {
    if (x >= keys[i - 1][0] && x <= keys[i][0]) return mix(keys[i - 1][1], keys[i][1], (x - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]));
  }
  return 0;
}
