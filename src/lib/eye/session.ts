"use client";

import { useSyncExternalStore } from "react";
import { EMPTY_ANSWERS, type EyeMode, type EyeScreen, type FlowAnswers } from "./flow";
import { getVisitPrefs } from "@/lib/visit-prefs";
import { speakAloud, stopSpeaking } from "./speak";

// The Eye mode conversation lives in this module's memory, nothing else: no localStorage, no cookies, no server.
//  - It survives moving between pages in the app (leave the eye board, come back: you are where you were),
//    so going back and forth is a reload point rather than a restart.
//  - It is wiped by Clear, by the idle timeout, and by a page reload or closing the tab.
//  - A clinician pressing Clear leaves nothing behind.

export type EyeState = {
  mode: EyeMode | null; // null until the clinician picks Intake or Conversation
  screen: EyeScreen;
  answers: FlowAnswers;
  muted: boolean;
  lastSaid: string | null; // the last sentence spoken for the patient, kept on screen for staff
  lastIntake: string | null; // the finished intake summary, shown on the done screen
  intake: FlowAnswers | null; // the finished intake, kept so the clinician can read it during conversation
  log: { at: number; text: string; help: boolean }[]; // what the device said for the patient, oldest first
};

const INITIAL: EyeState = { mode: null, screen: "mode", answers: EMPTY_ANSWERS, muted: false, lastSaid: null, lastIntake: null, intake: null, log: [] };

let state: EyeState = INITIAL;
const listeners = new Set<() => void>();

function set(patch: Partial<EyeState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export const getEyeState = () => state;
export function subscribeEye(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
export function useEyeState(): EyeState {
  return useSyncExternalStore(subscribeEye, getEyeState, () => INITIAL);
}

export const eye = {
  /** The clinician picks a mode. Intake starts at the questions; Conversation starts at its home screen. */
  start(mode: EyeMode) {
    // A fresh session follows the clinician's default for speaking aloud; switching modes keeps the current switch.
    const muted = state.mode === null ? !getVisitPrefs().speakAloud : state.muted;
    set({ mode, muted, screen: mode === "intake" ? "pain_q" : "home", answers: EMPTY_ANSWERS });
  },
  go(screen: EyeScreen) {
    set({ screen });
  },
  answers(answers: FlowAnswers) {
    set({ answers });
  },
  /** Say it aloud (unless muted), keep it on screen for staff. */
  say(text: string, help = false) {
    if (!text.trim()) return;
    if (!state.muted) speakAloud(text);
    set({ lastSaid: text, log: [...state.log, { at: Date.now(), text, help }].slice(-40) });
  },
  setMuted(muted: boolean) {
    if (muted) stopSpeaking();
    set({ muted });
  },
  finishIntake(intake: FlowAnswers, summary: string) {
    set({ intake, lastIntake: summary, screen: "done" });
  },
  /** Back to the mode's home screen with this message's answers cleared. */
  home() {
    set({ screen: state.mode === "intake" ? "done" : "home", answers: EMPTY_ANSWERS });
  },
  /** Force clear (Clear button, idle timeout): nothing is kept. */
  clear() {
    stopSpeaking();
    set({ ...INITIAL });
  },
};
