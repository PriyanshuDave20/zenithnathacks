// Dwell-to-select for the gaze input channel: hold the gaze point on one target for a fixed
// time (2 s) and it fires. Pure state machine over a virtual clock, so it is unit-testable;
// src/components/input/gaze/gaze-layer.tsx feeds it per frame and performs the actual click.

export type DwellConfig = {
  /** The gaze point may wander this far (px) without losing the accumulated dwell. */
  radius: number;
  /** How long the gaze must stay on one target before it fires. */
  durationMs: number;
  /** Minimum cooldown after firing. The fired target also requires looking away to rearm. */
  cooldownMs: number;
};

export const DEFAULT_DWELL: DwellConfig = { radius: 56, durationMs: 2000, cooldownMs: 900 };

export type DwellState = {
  /** The target key currently accumulating, or null. */
  target: string | null;
  /** 0..1 how far along the dwell is. */
  progress: number;
};

export class DwellController {
  private target: string | null = null;
  private start = 0;
  private blockedUntil = 0;
  private firedTarget: string | null = null;

  constructor(private cfg: DwellConfig = DEFAULT_DWELL) {}

  /**
   * Feed the current gaze target key each frame (null when the gaze is on nothing selectable or
   * no face is seen). Passing a different key, or null, restarts the dwell from zero.
   */
  update(now: number, target: string | null): DwellState {
    if (target !== this.firedTarget) this.firedTarget = null;
    if (target && target === this.firedTarget) return { target: null, progress: 0 };
    if (now < this.blockedUntil) return { target: null, progress: 0 };
    if (target !== this.target) {
      this.target = target;
      this.start = now;
    }
    const progress = target ? Math.min((now - this.start) / this.cfg.durationMs, 1) : 0;
    return { target, progress };
  }

  /** Call right after activating a target; blocks new dwells for the cooldown period. */
  fired(now: number) {
    this.firedTarget = this.target;
    this.blockedUntil = now + this.cfg.cooldownMs;
    this.target = null;
    this.start = now;
  }

  get config() {
    return this.cfg;
  }
}
