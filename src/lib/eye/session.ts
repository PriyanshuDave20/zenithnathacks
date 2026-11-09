"use client";

import { useSyncExternalStore } from "react";
import { EMPTY_ANSWERS, type EyeMode, type EyeScreen, type FlowAnswers } from "./flow";
import { speakAloud, stopSpeaking, replayEyeSpeech, type EyeSpeechStatus } from "./speak";

import { eyeLanguage, localizeEyeSpeech, type EyeLanguage } from "../questions/eye-localization";

// The Eye mode conversation lives in this module's memory, nothing else: no localStorage, no cookies, no server.
//  - It survives moving between pages in the app (leave the eye board, come back: you are where you were),
//    so going back and forth is a reload point rather than a restart.
//  - It is wiped by Clear, account changes/sign-out, the idle timeout, and a page reload or closing the tab.
//  - A clinician pressing Clear leaves nothing behind.

export type EyeState = {
  language: EyeLanguage;
  mode: EyeMode | null; // null until the clinician picks Intake or Conversation
  screen: EyeScreen;
  answers: FlowAnswers;
  muted: boolean;
  lastSaid: string | null; // the latest selected sentence; speechStatus says whether it was actually spoken
  speechStatus: EyeSpeechStatus;
  lastIntake: string | null; // the finished intake summary, shown on the done screen
  intake: FlowAnswers | null; // the finished intake, kept so the clinician can read it during conversation
  log: { at: number; text: string; help: boolean }[]; // patient choices, including muted ones, oldest first
};

const INITIAL: EyeState = { language: "en", mode: null, screen: "mode", answers: EMPTY_ANSWERS, muted: false, lastSaid: null, speechStatus: "idle", lastIntake: null, intake: null, log: [] };

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

function stopCurrentSpeech() {
  stopSpeaking();
  if (state.speechStatus === "queued" || state.speechStatus === "speaking" || state.speechStatus === "audio-ready" || state.speechStatus === "browser-ready") set({ speechStatus: "stopped" });
}

export const eye = {
  setLanguage(value: string) {
    const language = eyeLanguage(value);
    if (language === state.language) return;
    stopCurrentSpeech();
    set({ ...INITIAL, language });
  },
  repeat() {
    if (state.muted || !state.lastSaid) return;
    // Resume a blocked clip with its current queue when possible. Navigation,
    // handoff and mute dispose that controller, but retain the selected message.
    // Rebuild playback from memory without recording a second patient choice.
    if (!replayEyeSpeech()) speakAloud(state.lastSaid, (speechStatus) => set({ speechStatus }), state.language);
  },
  /** The clinician picks a mode. Intake starts at the questions; Conversation starts at its home screen. */
  start(mode: EyeMode) {
    stopCurrentSpeech();
    set({ mode, screen: mode === "intake" ? "pain_q" : "home", answers: EMPTY_ANSWERS });
  },
  go(screen: EyeScreen) {
    if (state.screen === "help" && screen !== "help") stopCurrentSpeech();
    set({ screen });
  },
  answers(answers: FlowAnswers) {
    set({ answers });
  },
  /** Say it aloud (unless muted), keep it on screen for staff. */
  say(text: string, help = false) {
    if (!text.trim()) return;
    const patientText = localizeEyeSpeech(text, state.language);
    if (!patientText) { set({ speechStatus: "error" }); return; }
    set({ lastSaid: patientText, speechStatus: state.muted ? "muted" : "queued", log: [...state.log, { at: Date.now(), text, help }].slice(-40) });
    if (!state.muted) speakAloud(patientText, (speechStatus) => set({ speechStatus }), state.language);
  },
  setMuted(muted: boolean) {
    if (muted) stopCurrentSpeech();
    set({ muted });
  },
  stopSpeech: stopCurrentSpeech,
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
