import { MetricsEventSchema, ModeSchema, type MetricsEvent, type Mode } from "../contracts";

type Event = MetricsEvent["event"];
type DurationBucket = "under_10s" | "under_30s" | "under_60s" | "under_5m" | "at_least_5m" | "unknown";
export type MetricsSnapshot = {
  events: Record<Mode, Record<Event, number>>;
  firstMessageDuration: Record<Mode, Record<DurationBucket, number>>;
};

export function incrementMetricCount(count: number): number {
  return Math.min(Number.MAX_SAFE_INTEGER, count + 1);
}

function durationBucket(ms: number | undefined): DurationBucket {
  if (ms === undefined) return "unknown";
  if (ms < 10_000) return "under_10s";
  if (ms < 30_000) return "under_30s";
  if (ms < 60_000) return "under_60s";
  if (ms < 300_000) return "under_5m";
  return "at_least_5m";
}

/** Fixed-size anonymous aggregates only: never keep raw events, exact timings or identifiers. */
export function createMetrics() {
  const state: MetricsSnapshot = {
    events: Object.fromEntries(ModeSchema.options.map(mode => [mode, {
      session_started: 0, first_message: 0, teachback_confirmed: 0,
    }])) as MetricsSnapshot["events"],
    firstMessageDuration: Object.fromEntries(ModeSchema.options.map(mode => [mode, {
      under_10s: 0, under_30s: 0, under_60s: 0, under_5m: 0, at_least_5m: 0, unknown: 0,
    }])) as MetricsSnapshot["firstMessageDuration"],
  };

  return {
    /** Counts accepted submissions, not distinct sessions; no identifier-based deduplication. */
    record(value: unknown): boolean {
      const result = MetricsEventSchema.safeParse(value);
      if (!result.success) return false;
      const { event, mode, msSinceStart } = result.data;
      state.events[mode][event] = incrementMetricCount(state.events[mode][event]);
      if (event === "first_message") {
        const bucket = durationBucket(msSinceStart);
        state.firstMessageDuration[mode][bucket] = incrementMetricCount(state.firstMessageDuration[mode][bucket]);
      }
      return true;
    },
    /** Internal server snapshot, detached from the counters; no public read endpoint. */
    snapshot(): MetricsSnapshot { return structuredClone(state); },
  };
}

/** Per-module/server-instance totals reset on restart or reload; not a durable/shared store. */
export const metrics = createMetrics();
