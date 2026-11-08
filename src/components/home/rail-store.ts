import { useSyncExternalStore } from "react";

/**
 * Tiny shared state between the modes section (its tabs) and the pinned phone on large screens,
 * which shows the patient's side of the chosen mode. Demo UI state only; nothing about a patient.
 */
type ModesState = { mode: number; lang: number; eyeChoice: string | null };

let state: ModesState = { mode: 0, lang: 0, eyeChoice: null };
const listeners = new Set<() => void>();

function set(next: Partial<ModesState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const SERVER: ModesState = { mode: 0, lang: 0, eyeChoice: null };

export function useModesState() {
  const s = useSyncExternalStore(subscribe, () => state, () => SERVER);
  return {
    mode: s.mode,
    lang: s.lang,
    eyeChoice: s.eyeChoice,
    setEyeChoice: (eyeChoice: string) => set({ eyeChoice }),
    setMode: (mode: number) => set({ mode }),
    setLang: (lang: number) => set({ lang }),
  };
}
