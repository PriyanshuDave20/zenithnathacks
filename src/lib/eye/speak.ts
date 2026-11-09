"use client";

import { createCloudSpeech, loadSpeechMetadata, speechMetadata } from "../../components/session/cloud-speech";
import { selectSpeechVoice } from "../../components/session/speech-playback";
import type { EyeLanguage } from "../questions/eye-localization";

export type EyeSpeechStatus = "idle" | "queued" | "speaking" | "spoken" | "muted" | "unavailable" | "error" | "stopped" | "audio-ready" | "browser-ready";
export const speechStatusLabel: Record<EyeSpeechStatus, string> = {
  idle: "No speech yet.", queued: "Waiting for the device to speak.", speaking: "Speaking aloud…", spoken: "Finished speaking aloud.",
  muted: "Not spoken. Sound was off when this choice was selected.", unavailable: "Speech is unavailable. Please show this choice to the clinician.",
  error: "The device could not speak. Please show this choice to the clinician.", stopped: "Speech stopped. The choice remains on screen.",
  "audio-ready": "Tap Speak again to play the audio.", "browser-ready": "Azure audio is unavailable. Tap Use device voice to try this device’s voice.",
};
export function canSpeak(): boolean {
  return typeof window !== "undefined" && ("Audio" in window || "speechSynthesis" in window);
}

let generation = 0;
let playback: ReturnType<typeof createCloudSpeech> | undefined;
let replay: (() => void) | undefined;

export function prepareEyeSpeech(): void { if (typeof window !== "undefined") void loadSpeechMetadata(); }

/** Only registered public Eye phrases are passed to this public-clip-only player. */
export function speakAloud(text: string, onStatus: (status: EyeSpeechStatus) => void, language: EyeLanguage = "en"): void {
  if (!text.trim()) return;
  stopSpeaking();
  if (!canSpeak()) { onStatus("unavailable"); return; }
  const current = generation;
  const report = (status: EyeSpeechStatus) => { if (current === generation) onStatus(status); };
  report("queued");
  // Metadata contains fixed public copy only. Await it so a first choice cannot silently
  // bypass Azure while the manifest is still loading. Safari can request a fresh tap.
  void loadSpeechMetadata().then(() => {
    if (current !== generation) return;
    let utterance: SpeechSynthesisUtterance | undefined;
    let fallbackOffered = false;
    const local = {
      speak(value: string, lang: string) {
        if (!fallbackOffered) { fallbackOffered = true; report("browser-ready"); return; }
        try {
          if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") { report("unavailable"); return; }
          const synthesis = window.speechSynthesis;
          const voice = selectSpeechVoice(synthesis.getVoices(), lang);
          if (!voice) { report("unavailable"); return; }
          const next = new SpeechSynthesisUtterance(value);
          utterance = next;
          next.lang = voice.lang;
          next.voice = voice;
          next.rate = 0.95;
          next.onstart = () => { if (utterance === next) report("speaking"); };
          next.onend = () => { if (utterance === next) { utterance = undefined; report("spoken"); } };
          next.onerror = () => { if (utterance === next) { utterance = undefined; report("error"); } };
          synthesis.speak(next);
        } catch { report("error"); }
      },
      stop() {
        if (!utterance) return;
        utterance.onstart = utterance.onend = utterance.onerror = null;
        utterance = undefined;
        try { window.speechSynthesis.cancel(); } catch { /* Already stopped. */ }
      },
      dispose() { this.stop(); },
    };
    playback = createCloudSpeech(local, state => {
      if (state.speaking) report("speaking");
      else if (state.status === "audio-ready" || state.status === "browser-ready") { if (state.status === "browser-ready") fallbackOffered = true; report(state.status); }
      else if (state.status === "loading-audio") report("queued");
    }, {
      fetch: window.fetch.bind(window), makeAudio: () => new Audio(),
      createUrl: blob => URL.createObjectURL(blob), revokeUrl: url => URL.revokeObjectURL(url), metadata: speechMetadata, onComplete: () => report("spoken"),
    });
    replay = () => playback?.speak(text, language, { kind: "public" });
    replay();
  }).catch(() => report("error"));
}

/** Reuses an autoplay-blocked clip (or explicitly requested device fallback) from a fresh gesture. */
export function replayEyeSpeech(): boolean {
  if (!replay) return false;
  replay();
  return true;
}
export function stopSpeaking(): void {
  generation++;
  playback?.dispose(); playback = undefined;
  replay = undefined;
}
