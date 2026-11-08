"use client";

import { useSyncExternalStore } from "react";

// How THIS clinician likes to read and copy the summary. It is about the clinician, not the patient, so it is the
// same for every visit. Like the session timeout it is one small value in this browser's localStorage: no account
// field, nothing sent anywhere, nothing a patient said. The summary itself is English for now, so there is no language
// choice here. "Flags to check" are never hidden by any of these settings.

export type SummaryPrefs = {
  detail: "full" | "brief"; // brief tucks the original words and read-back behind one tap
  flagsFirst: boolean; // show "Flags to check" above the rest of the summary
  copy: "conversation" | "summary" | "both"; // what the Copy button puts on the clipboard
};

export const DEFAULT_SUMMARY_PREFS: SummaryPrefs = { detail: "full", flagsFirst: false, copy: "conversation" };

export const COPY_OPTIONS: { id: SummaryPrefs["copy"]; label: string }[] = [
  { id: "conversation", label: "Conversation" },
  { id: "summary", label: "Summary" },
  { id: "both", label: "Summary and conversation" },
];

const KEY = "synapse.prefs.summary";
const listeners = new Set<() => void>();

/** Keeps only valid values, so an old or edited value can never break the summary screen. */
function parse(raw: string | null): SummaryPrefs {
  if (!raw) return DEFAULT_SUMMARY_PREFS;
  try {
    const v = JSON.parse(raw) as Partial<SummaryPrefs>;
    return {
      detail: v.detail === "brief" ? "brief" : "full",
      flagsFirst: v.flagsFirst === true,
      copy: COPY_OPTIONS.some((o) => o.id === v.copy) ? (v.copy as SummaryPrefs["copy"]) : "conversation",
    };
  } catch {
    return DEFAULT_SUMMARY_PREFS;
  }
}

let cachedRaw: string | null | undefined;
let cached: SummaryPrefs = DEFAULT_SUMMARY_PREFS;

/** Stable between changes, so useSyncExternalStore does not re-render needlessly. */
export function getSummaryPrefs(): SummaryPrefs {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    raw = null; // storage unavailable: use the defaults
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parse(raw);
  }
  return cached;
}

export function setSummaryPrefs(patch: Partial<SummaryPrefs>) {
  const next = { ...getSummaryPrefs(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: the choice lasts only for this page view */
  }
  cachedRaw = undefined;
  cached = next;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useSummaryPrefs(): SummaryPrefs {
  return useSyncExternalStore(subscribe, getSummaryPrefs, () => DEFAULT_SUMMARY_PREFS);
}
