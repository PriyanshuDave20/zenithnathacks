"use client";

import { useSyncExternalStore } from "react";

// The clinician's own "clear an idle session after..." preference. It is a setting of the clinician's
// device, never patient data: one small value in this browser's localStorage, no account field, nothing sent.
// Default is 6 hours; the dashboard lets the clinician choose a shorter time.

export const SESSION_TIMEOUT_OPTIONS = [
  { id: "10m", ms: 10 * 60_000, label: "10 minutes", spoken: "ten minutes" },
  { id: "30m", ms: 30 * 60_000, label: "30 minutes", spoken: "thirty minutes" },
  { id: "1h", ms: 60 * 60_000, label: "1 hour", spoken: "one hour" },
  { id: "2h", ms: 2 * 60 * 60_000, label: "2 hours", spoken: "two hours" },
  { id: "6h", ms: 6 * 60 * 60_000, label: "6 hours", spoken: "six hours" },
] as const;

export type SessionTimeoutId = (typeof SESSION_TIMEOUT_OPTIONS)[number]["id"];
export const DEFAULT_SESSION_TIMEOUT: SessionTimeoutId = "6h";
/** The warning (with Keep session) shows this long before the session clears. */
export const SESSION_WARNING_MS = 30_000;

const KEY = "synapse.prefs.session-timeout";
const listeners = new Set<() => void>();

export function isSessionTimeoutId(value: unknown): value is SessionTimeoutId {
  return SESSION_TIMEOUT_OPTIONS.some((o) => o.id === value);
}

export function optionFor(id: SessionTimeoutId) {
  return SESSION_TIMEOUT_OPTIONS.find((o) => o.id === id) ?? SESSION_TIMEOUT_OPTIONS[SESSION_TIMEOUT_OPTIONS.length - 1];
}

/** Milliseconds of inactivity before the warning appears (the chosen time minus the warning). */
export function idleMsFor(id: SessionTimeoutId): number {
  return optionFor(id).ms - SESSION_WARNING_MS;
}

function read(): SessionTimeoutId {
  try {
    const raw = localStorage.getItem(KEY);
    return isSessionTimeoutId(raw) ? raw : DEFAULT_SESSION_TIMEOUT;
  } catch {
    return DEFAULT_SESSION_TIMEOUT; // storage unavailable: use the default
  }
}

export function setSessionTimeout(id: SessionTimeoutId) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* storage unavailable: the choice lasts only for this page view */
  }
  current = id;
  listeners.forEach((l) => l());
}

let current: SessionTimeoutId | null = null;
function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      current = read();
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}
function snapshot(): SessionTimeoutId {
  return (current ??= read());
}

/** The clinician's chosen session timeout (the default on the server and before hydration). */
export function useSessionTimeout(): SessionTimeoutId {
  return useSyncExternalStore(subscribe, snapshot, () => DEFAULT_SESSION_TIMEOUT);
}
