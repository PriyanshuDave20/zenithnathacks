import type { MetricsEvent, Mode } from "../../lib/contracts";
import { track } from "./api";

/** One active client flow. Holds only a mode, elapsed clock and three once-flags. */
export class SessionMetrics {
  private mode: Mode | null = null;
  private startedAt = 0;
  private shared = false;
  private understood = false;

  constructor(
    private readonly emit: (event: MetricsEvent) => void = track,
    private readonly now: () => number = () => performance.now(),
  ) {}

  start(mode: Mode): void {
    if (this.mode !== null) return;
    this.mode = mode;
    this.startedAt = this.now();
    this.emit({ event: "session_started", mode });
  }

  firstMessage(): void {
    if (this.mode === null || this.shared) return;
    this.shared = true;
    const elapsed = this.now() - this.startedAt;
    this.emit({
      event: "first_message",
      mode: this.mode,
      ...(Number.isFinite(elapsed) ? { msSinceStart: Math.max(0, elapsed) } : {}),
    });
  }

  teachback(): void {
    if (this.mode === null || this.understood) return;
    this.understood = true;
    this.emit({ event: "teachback_confirmed", mode: this.mode });
  }

  reset(): void {
    this.mode = null;
    this.startedAt = 0;
    this.shared = false;
    this.understood = false;
  }
}
