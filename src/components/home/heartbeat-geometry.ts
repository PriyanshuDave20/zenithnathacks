export type Point = { x: number; y: number; z: number };
export type Stage = { x: number; top: number; height: number; radius: number; dockX: number; dockY: number };

export const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export function ease(a: number, b: number, n: number) {
  const t = clamp((n - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** One continuous route: helix around the staff, then a tangent-aligned curve to the header. */
export function journeyPoint(distance: number, stage: Stage): Point {
  const { x, top, height, radius, dockX, dockY } = stage;
  if (distance <= 1) {
    const angle = distance * Math.PI * 5;
    return { x: x + Math.sin(angle) * radius, y: top + height * (1 - distance), z: Math.cos(angle) };
  }
  if (distance >= 1.65) {
    return { x: mix(x, dockX, ease(1.65, 2.15, distance)), y: dockY, z: 1 };
  }
  const t = clamp((distance - 1) / 0.65);
  const a = 1 - t;
  // A tight release from the tip; the head accelerates upward instead of swinging sideways.
  const reach = Math.min(20, height * 0.07);
  return {
    x: a ** 3 * x + 3 * a * a * t * (x - reach) + 3 * a * t * t * x + t ** 3 * x,
    y: a ** 3 * top + 3 * a * a * t * (top - reach) + 3 * a * t * t * dockY + t ** 3 * dockY,
    z: 1,
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
