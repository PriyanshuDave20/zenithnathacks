"use client";

import { nextTheme, setThemePref, useThemePref, type ThemePref } from "@/lib/theme-pref";

const LABEL: Record<ThemePref, string> = { auto: "Automatic", light: "Light", dark: "Dark" };

// One consistent stroke (1.8) and size, drawn here: a monitor for "follows this device", a sun, a moon.
function Glyph({ pref }: { pref: ThemePref }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (pref === "light")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
      </svg>
    );
  if (pref === "dark")
    return (
      <svg {...common}>
        <path d="M20 14.2A8 8 0 1 1 9.8 4a6.4 6.4 0 0 0 10.2 10.2z" />
      </svg>
    );
  return (
    <svg {...common}>
      <rect x="3" y="4" width="18" height="12" rx="2.2" />
      <path d="M8.5 20h7M12 16v4" />
    </svg>
  );
}

/** A tiny button for the header bar: cycles Automatic, Light, Dark. Sits on the navy header. */
export function ThemeToggle() {
  const pref = useThemePref();
  const next = nextTheme(pref);
  const label = `Appearance: ${LABEL[pref]}. Switch to ${LABEL[next]}.`;
  return (
    <button
      type="button"
      onClick={() => setThemePref(next)}
      aria-label={label}
      title={label}
      className="press grid size-11 shrink-0 place-items-center rounded-full text-on-navy-soft hover:bg-navy-raised hover:text-white"
    >
      <Glyph pref={pref} />
    </button>
  );
}
