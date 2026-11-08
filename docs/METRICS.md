# Anonymous demo metrics

Backend 1 provides `POST /api/metrics` for the existing `MetricsEventSchema` in
`src/lib/contracts/index.ts`. The demo uses fixed server-memory aggregates. Prem
delegated the storage choice; this keeps the task independent of PostgreSQL,
clinician accounts and schema changes.

## Request and response

```json
{ "event": "first_message", "mode": "low_literacy", "msSinceStart": 12500 }
```

The existing events are `session_started`, `first_message` and
`teachback_confirmed`. Modes are `standard`, `deaf_hoh`, `low_literacy`, `mute` and
`icu`. `msSinceStart` is optional and must be a nonnegative finite number.
Extra properties, including identifiers or message content, are rejected.

Successful submissions return **204 with an empty body**. Malformed or invalid
requests return **400**; bodies exceeding **1,024 bytes** return **413**. An internal
aggregate failure returns **500** with code `metrics_unavailable`. Errors use the
existing generic `{ error: { code, message } }` shape without echoing input.
Success and error responses include `Cache-Control: no-store`. There is no public
GET, reset or export endpoint.

## Aggregation and privacy

The sink keeps only a fixed number of event counters per mode. First-message
timings are immediately reduced to counts in these buckets:

| Bucket | Duration |
|--------|----------|
| Under 10 seconds | `0 <= ms < 10,000` |
| 10 to under 30 seconds | `10,000 <= ms < 30,000` |
| 30 to under 60 seconds | `30,000 <= ms < 60,000` |
| 1 to under 5 minutes | `60,000 <= ms < 300,000` |
| 5 minutes or more | `ms >= 300,000` |
| Unknown | First-message timing omitted |

Timing supplied for the other event types is accepted by the existing contract
and discarded. Exact timings, event objects, timestamps, identifiers, content,
request headers and per-session records are not retained. The application does
not log request or response bodies or write metrics to a database, file, cache or
external service. Internal server code can inspect `metrics.snapshot()` from
`src/lib/server/metrics.ts`; it returns a detached copy of the fixed aggregates.

These are **counts of submissions**, not unique patients or sessions. Retries
count again, and the anonymous endpoint does not establish authenticity or link
events. It cannot measure a verified per-session completion rate.

## Demo limits and integration

Each server process/module instance has its own totals. Restart, development
reload, cold start or instance recycling can clear them. Multiple workers or
deployments do not share a durable total. This is a demo sink, not a persistent
analytics system.

This task is Backend 1 only. `src/components/session/api.ts` still has a disabled
`track()` adapter; the main frontend does not automatically submit these events.
The frontend owner must separately wire the desired events and handle the empty
204 response without blocking the conversation. That integration should not add
patient/session identifiers or retries that are assumed to deduplicate.

Real clinician authentication and clinician profile storage in PostgreSQL are
separate work. They must not attach clinician or patient identifiers to metrics.
