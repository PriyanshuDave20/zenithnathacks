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

The live frontend now submits events through `src/components/session/api.ts`.
`track()` validates and projects only event/mode/optional timing, omits credentials,
uses no-store, and silently abandons failures after five seconds. There is no
response parsing, retry, persistent queue, identifier or patient content.

The workspace starts its local clock when the patient first presses **I’m ready**
after setup. **First message** means the patient confirms the translated report or
explicitly shares their untranslated words. **Teach-back confirmed** means an
affirmative comprehension response after a clinician reply. Each event fires once
per active local flow, using the initial mode as its cohort. Returning to setup
within that flow does not create another event. Clear, expiry and navigation
cleanup reset the clock/flags. The unused legacy session component has been removed.

Eye starts on a deliberate choice on the patient board, including selecting its
mode or interacting with a resumed board. Its first new committed choice counts
as first message, including muted choices. Merely mounting an old log or updating
speech status does not count. Eye has no clinician-reply teach-back step, so a
generic Yes on that board does **not** emit teach-back confirmation. Returning to
a preserved Eye board creates a new local flow only on the next deliberate choice;
these counts describe frontend flows rather than unique clinical visits.

Only mode, elapsed clock and once-flags live in the browser's memory. PostgreSQL
clinician accounts remain separate and never attach identifiers to these events.
