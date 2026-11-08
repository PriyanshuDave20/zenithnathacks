"use client";

import { useSyncExternalStore } from "react";

// The clinician's light/dark choice for the clinician hub pages. A setting of this device: one small value in this
// browser's localStorage, no account field, nothing sent anywhere. Patient screens never use it (a patient on the same
// device has their own display options on the setup form).

export type ThemePref = "auto" | "light" | "dark";
export const THEME_ORDER: ThemePref[] = ["auto", "light", "dark"];
export const THEME_KEY = "synapse.prefs.theme";

/** "Automatic" follows the device, so the winner is decided here, once, and tested. */
export const resolveTheme = (pref: ThemePref, systemDark: boolean): "light" | "dark" => (pref === "auto" ? (systemDark ? "dark" : "light") : pref);
export const nextTheme = (pref: ThemePref): ThemePref => THEME_ORDER[(THEME_ORDER.indexOf(pref) + 1) % THEME_ORDER.length];

/** Only a valid value is accepted, so an old or edited value can never break a page. */
export const parseTheme = (raw: string | null): ThemePref => (raw === "light" || raw === "dark" ? raw : "auto");

const listeners = new Set<() => void>();

export function getThemePref(): ThemePref {
  try {
    return parseTheme(localStorage.getItem(THEME_KEY));
  } catch {
    return "auto"; // storage unavailable: follow the device
  }
}

export function setThemePref(pref: ThemePref) {
  try {
    localStorage.setItem(THEME_KEY, pref);
  } catch {
    /* storage unavailable: the choice lasts only for this page view */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => e.key === THEME_KEY && cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useThemePref(): ThemePref {
  return useSyncExternalStore(subscribe, getThemePref, () => "auto" as ThemePref);
}
