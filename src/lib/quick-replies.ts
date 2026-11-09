"use client";

import { useSyncExternalStore } from "react";

// THIS clinician's own saved quick replies: reusable phrases like "Please wait here". They are about the clinician's
// routine, never about a patient, so they follow the same rule as the other preferences: one small list in this
// browser's localStorage, no account field, nothing sent anywhere. The add form warns against names and identifiers.

export const MAX_QUICK_REPLIES = 20;
export const MAX_QUICK_REPLY_LENGTH = 200;

const KEY = "synapse.prefs.quick-replies";
const EMPTY: readonly string[] = Object.freeze([]);
const listeners = new Set<() => void>();

/** Keeps only non-empty strings within the limits, so an old or edited value can never break a screen. */
function parse(raw: string | null): readonly string[] {
  if (!raw) return EMPTY;
  try {
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v)) return EMPTY;
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of v) {
      if (typeof item !== "string") continue;
      const text = item.trim().slice(0, MAX_QUICK_REPLY_LENGTH);
      if (!text || seen.has(text)) continue;
      seen.add(text);
      out.push(text);
      if (out.length >= MAX_QUICK_REPLIES) break;
    }
    return out;
  } catch {
    return EMPTY;
  }
}

let cachedRaw: string | null | undefined;
let cached: readonly string[] = EMPTY;

/** Stable between changes, so useSyncExternalStore does not re-render needlessly. */
export function getQuickReplies(): readonly string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    raw = null; // storage unavailable: no saved replies
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parse(raw);
  }
  return cached;
}

function write(next: readonly string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: the list lasts only for this page view */
  }
  cachedRaw = undefined;
  cached = next;
  listeners.forEach((l) => l());
}

export type AddResult = "added" | "empty" | "duplicate" | "full";

export function addQuickReply(text: string): AddResult {
  const clean = text.trim().slice(0, MAX_QUICK_REPLY_LENGTH);
  if (!clean) return "empty";
  const current = getQuickReplies();
  if (current.includes(clean)) return "duplicate";
  if (current.length >= MAX_QUICK_REPLIES) return "full";
  write([...current, clean]);
  return "added";
}

export function removeQuickReply(text: string) {
  write(getQuickReplies().filter((r) => r !== text));
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

export function useQuickReplies(): readonly string[] {
  return useSyncExternalStore(subscribe, getQuickReplies, () => EMPTY);
}
