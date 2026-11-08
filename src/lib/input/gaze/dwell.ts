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
  /** Brief excursions pause rather than discard progress; no time is earned off target. */
  jitterGraceMs?: number;
};

export const DEFAULT_DWELL: DwellConfig = { radius: 56, durationMs: 2000, cooldownMs: 900, jitterGraceMs: 250 };

export type DwellState = {
  /** The target key currently accumulating, or null. */
  target: string | null;
  /** 0..1 how far along the dwell is. */
  progress: number;
};

export class DwellController {
  private target: string | null = null;
  private elapsed = 0;
  private lastAt: number | null = null;
  private lastInput: string | null = null;
  private offSince = -1;
  private blockedUntil = 0;
  private firedTarget: string | null = null;
  private awaySince = -1;

  constructor(private cfg: DwellConfig = DEFAULT_DWELL) {}

  /**
   * Brief jitter pauses the active target's clock. A sustained move starts a fresh dwell.
   * `valid=false` is a blink/tracking loss: it cannot count as looking away to rearm.
   */
  update(now: number, input: string | null, valid = true): DwellState {
    const grace = this.cfg.jitterGraceMs ?? DEFAULT_DWELL.jitterGraceMs!;
    const dt = this.lastAt === null ? 0 : Math.max(0, now - this.lastAt);
    const previousInput = this.lastInput;
    const target = valid ? input : null;
    this.lastAt = now;
    this.lastInput = target;

    if (this.firedTarget) {
      if (!valid || target === this.firedTarget) this.awaySince = -1;
      else {
        if (this.awaySince < 0) this.awaySince = now;
        if (now - this.awaySince >= grace) this.firedTarget = null;
      }
      if (target === this.firedTarget) return { target: null, progress: 0 };
    }
    if (now < this.blockedUntil) {
      this.lastInput = null;
      return { target: null, progress: 0 };
    }

    if (target && target === this.target) {
      if (this.offSince >= 0) {
        if (now - this.offSince > grace) this.elapsed = 0;
        // Returning from an excursion never earns the time spent away, even if it was brief.
        this.offSince = -1;
      } else if (previousInput === target) this.elapsed += dt;
    } else if (this.target) {
      if (this.offSince < 0) this.offSince = now;
      if (now - this.offSince >= grace) {
        this.target = target;
        this.elapsed = 0;
        this.offSince = -1;
      }
    } else {
      this.target = target;
      this.elapsed = 0;
      this.offSince = -1;
    }
    return { target: this.target, progress: this.target ? Math.min(this.elapsed / this.cfg.durationMs, 1) : 0 };
  }

  /** Hard interruption (hidden page, invalid head pose, recenter): discard dwell, keep rearm lock. */
  interrupt(now: number) {
    this.target = null;
    this.elapsed = 0;
    this.lastAt = now;
    this.lastInput = null;
    this.offSince = -1;
    this.awaySince = -1;
  }

  /** Call right after activating a target; requires cooldown and a sustained valid look away. */
  fired(now: number) {
    this.firedTarget = this.target;
    this.blockedUntil = now + this.cfg.cooldownMs;
    this.interrupt(now);
  }

  get config() {
    return this.cfg;
  }
}
