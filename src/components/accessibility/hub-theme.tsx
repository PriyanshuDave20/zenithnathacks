"use client";

import { useLayoutEffect } from "react";
import { getA11yPrefs, resolveContrast, resolveTheme } from "@/lib/accessibility-prefs";
import { useA11yPrefs } from "@/lib/accessibility-prefs";

/**
 * Applies the clinician's light/dark and contrast choices to the page while a clinician hub page is on screen, and
 * removes them when it leaves (so a patient screen never inherits the clinician's theme). Renders nothing.
 * "Automatic" follows the device and keeps following it if the device changes while the page is open.
 * Runs before paint (these pages render only in the browser, behind the sign-in check), so there is no flash.
 */
export function HubTheme() {
  const prefs = useA11yPrefs();

  useLayoutEffect(() => {
    const root = document.documentElement;
    const dark = window.matchMedia("(prefers-color-scheme: dark)");
    const more = window.matchMedia("(prefers-contrast: more)");
    const apply = () => {
      const p = getA11yPrefs();
      root.dataset.theme = resolveTheme(p.theme, dark.matches);
      root.dataset.contrast = resolveContrast(p.contrast, more.matches);
    };
    apply();
    dark.addEventListener("change", apply);
    more.addEventListener("change", apply);
    return () => {
      dark.removeEventListener("change", apply);
      more.removeEventListener("change", apply);
      delete root.dataset.theme;
      delete root.dataset.contrast;
    };
    // re-run when the clinician changes a choice
  }, [prefs]);

  return null;
}
