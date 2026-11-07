import { useSyncExternalStore } from "react";

/**
 * Tiny shared state between the modes section (its tabs) and the pinned phone on large screens,
 * which shows the patient's side of the chosen mode. Demo UI state only; nothing about a patient.
 */
type ModesState = { mode: number; lang: number };

let state: ModesState = { mode: 0, lang: 0 };
const listeners = new Set<() => void>();

function set(next: Partial<ModesState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const SERVER: ModesState = { mode: 0, lang: 0 };

export function useModesState() {
  const s = useSyncExternalStore(subscribe, () => state, () => SERVER);
  return {
    mode: s.mode,
    lang: s.lang,
    setMode: (mode: number) => set({ mode }),
    setLang: (lang: number) => set({ lang }),
  };
}
