"use client";

import { useSyncExternalStore } from "react";

// The clinician's own display needs. A setting of this device: one small value in this browser's localStorage, no
// account field, nothing sent anywhere, nothing a patient said.
//  - theme and contrast are applied on the clinician hub pages only (a patient sees the same device and keeps their own
//    display controls inside a session);
//  - colourBlind is device-wide, because the red alerts (body-diagram pain spots, Eye mode Help) live in session screens.

export type ThemePref = "auto" | "light" | "dark";
export type ContrastPref = "auto" | "standard" | "high";
export type A11yPrefs = { theme: ThemePref; contrast: ContrastPref; colourBlind: boolean };

export const DEFAULT_A11Y: A11yPrefs = { theme: "auto", contrast: "auto", colourBlind: false };
export const A11Y_KEY = "synapse.prefs.a11y";

/** "Automatic" follows the device, so the choice that wins is decided here, once, and tested. */
export const resolveTheme = (pref: ThemePref, systemDark: boolean): "light" | "dark" => (pref === "auto" ? (systemDark ? "dark" : "light") : pref);
export const resolveContrast = (pref: ContrastPref, systemMore: boolean): "standard" | "high" => (pref === "auto" ? (systemMore ? "high" : "standard") : pref);

/** Keeps only valid values, so an old or edited value can never break a page. */
export function parseA11y(raw: string | null): A11yPrefs {
  if (!raw) return DEFAULT_A11Y;
  try {
    const v = JSON.parse(raw) as Partial<A11yPrefs>;
    return {
      theme: v.theme === "light" || v.theme === "dark" ? v.theme : "auto",
      contrast: v.contrast === "standard" || v.contrast === "high" ? v.contrast : "auto",
      colourBlind: v.colourBlind === true,
    };
  } catch {
    return DEFAULT_A11Y;
  }
}

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cached: A11yPrefs = DEFAULT_A11Y;

/** Stable between changes, so useSyncExternalStore does not re-render needlessly. */
export function getA11yPrefs(): A11yPrefs {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(A11Y_KEY);
  } catch {
    raw = null; // storage unavailable: use the defaults
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parseA11y(raw);
  }
  return cached;
}

export function setA11yPrefs(patch: Partial<A11yPrefs>) {
  const next = { ...getA11yPrefs(), ...patch };
  try {
    localStorage.setItem(A11Y_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: the choice lasts only for this page view */
  }
  cachedRaw = undefined;
  cached = next;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => e.key === A11Y_KEY && cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useA11yPrefs(): A11yPrefs {
  return useSyncExternalStore(subscribe, getA11yPrefs, () => DEFAULT_A11Y);
}
