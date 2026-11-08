"use client";

import { useLayoutEffect } from "react";
import { useA11yPrefs } from "@/lib/accessibility-prefs";

/**
 * Keeps the colour-blind friendly switch on <html> in step with the clinician's setting, on every page (the red alerts
 * it changes live in session screens). The first paint is handled by a tiny script in the root layout; this keeps it
 * live when the setting changes. Renders nothing.
 */
export function ColourVision() {
  const { colourBlind } = useA11yPrefs();
  useLayoutEffect(() => {
    document.documentElement.dataset.cvd = colourBlind ? "on" : "off";
  }, [colourBlind]);
  return null;
}
