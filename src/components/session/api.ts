// The only place the session UI talks to the backend. Today it calls the frontend mocks; when
// Backend 1's routes land, replace each body with fetch("/api/...") and keep the shapes from docs/API.md.
import {
  mockMetrics,
  mockRespond,
  mockTranslate,
  type MetricsEvent,
  type RespondRequest,
  type RespondResponse,
  type TranslateRequest,
  type TranslateResponse,
} from "@/lib/mocks";

export const USING_MOCKS = true;

export function translate(req: TranslateRequest): Promise<TranslateResponse> {
  return mockTranslate(req);
}

export function respond(req: RespondRequest): Promise<RespondResponse> {
  return mockRespond(req);
}

/** Anonymous counts only; never content. Failures are swallowed so metrics can never block a visit. */
export function track(event: MetricsEvent): void {
  mockMetrics(event).catch(() => {});
}
