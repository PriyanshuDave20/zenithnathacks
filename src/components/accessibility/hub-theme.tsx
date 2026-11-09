"use client";

import { useLayoutEffect } from "react";
import { getThemePref, resolveTheme, useThemePref } from "@/lib/theme-pref";

/**
 * Applies the clinician's light/dark choice to the page while a clinician hub page is on screen, and removes it when
 * the page leaves (so a patient screen never inherits the clinician's theme). Renders nothing.
 * "Automatic" follows the device and keeps following it if the device changes while the page is open.
 * Runs before paint (these pages render only in the browser, behind the sign-in check), so there is no flash.
 */
export function HubTheme() {
  const pref = useThemePref();

  useLayoutEffect(() => {
    const root = document.documentElement;
    const dark = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      root.dataset.theme = resolveTheme(getThemePref(), dark.matches);
    };
    apply();
    dark.addEventListener("change", apply);
    return () => {
      dark.removeEventListener("change", apply);
      delete root.dataset.theme;
    };
    // re-run when the clinician changes the choice
  }, [pref]);

  return null;
}
