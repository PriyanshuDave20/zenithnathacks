"use client";

import { useSyncExternalStore } from "react";
import { PATIENT_LANGUAGES, type Mode, type PatientLanguage } from "@/lib/mocks";

// The clinician's own starting choices for a visit. Like the session timeout, this is a setting of the
// clinician's device: one small value in this browser's localStorage, no account field, nothing sent anywhere,
// and never anything the patient said. It only decides what the start screen shows first.

export type VisitPrefs = {
  language: PatientLanguage | null; // null: no preference, the app's usual starting language
  mode: Mode | null; // null: no preference
  contrast: boolean; // start sessions in high contrast
  speakAloud: boolean; // Eye mode speaks the patient's choices aloud
};

export const MODES: { id: Mode; label: string }[] = [
  { id: "standard", label: "Speak & translate" },
  { id: "deaf_hoh", label: "Deaf / hard of hearing" },
  { id: "low_literacy", label: "Pictures & simple questions" },
  { id: "mute", label: "Can’t speak" },
  { id: "icu", label: "Eye mode" },
];

export const DEFAULT_PREFS: VisitPrefs = { language: null, mode: null, contrast: false, speakAloud: true };

const KEY = "synapse.prefs.visit";
const listeners = new Set<() => void>();

/** Reads only values that are still valid, so an old or edited value can never break the start screen. */
function parse(raw: string | null): VisitPrefs {
  if (!raw) return DEFAULT_PREFS;
  try {
    const v = JSON.parse(raw) as Partial<VisitPrefs>;
    return {
      language: PATIENT_LANGUAGES.some((l) => l.code === v.language) ? (v.language as PatientLanguage) : null,
      mode: MODES.some((m) => m.id === v.mode) ? (v.mode as Mode) : null,
      contrast: v.contrast === true,
      speakAloud: v.speakAloud !== false,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

let cachedRaw: string | null | undefined;
let cached: VisitPrefs = DEFAULT_PREFS;

/** Stable between changes, so useSyncExternalStore does not re-render needlessly. */
export function getVisitPrefs(): VisitPrefs {
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

export function setVisitPrefs(patch: Partial<VisitPrefs>) {
  const next = { ...getVisitPrefs(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: the choice lasts only for this page view */
  }
  cachedRaw = undefined; // re-read next time
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

export function useVisitPrefs(): VisitPrefs {
  return useSyncExternalStore(subscribe, getVisitPrefs, () => DEFAULT_PREFS);
}
