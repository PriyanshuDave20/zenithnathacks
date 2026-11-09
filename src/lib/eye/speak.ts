"use client";

// Says a sentence aloud with the browser's own voice, on this device. Nothing is sent anywhere.
// The patient cannot speak, so the app speaks for them: the room hears it, and the clinician does not
// have to take the device.

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

export type EyeSpeechStatus = "idle" | "queued" | "speaking" | "spoken" | "muted" | "unavailable" | "error" | "stopped";

export const speechStatusLabel: Record<EyeSpeechStatus, string> = {
  idle: "No speech yet.",
  queued: "Waiting for the device to speak.",
  speaking: "Speaking aloud…",
  spoken: "Finished speaking aloud.",
  muted: "Not spoken. Sound was off when this choice was selected.",
  unavailable: "Speech is unavailable. Please show this choice to the clinician.",
  error: "The device could not speak. Please show this choice to the clinician.",
  stopped: "Speech stopped. The choice remains on screen.",
};

// Invalidates callbacks from a cancelled or superseded utterance.
let generation = 0;

export function speakAloud(text: string, onStatus: (status: EyeSpeechStatus) => void): void {
  if (!text.trim()) return;
  stopSpeaking();
  if (!canSpeak()) {
    onStatus("unavailable");
    return;
  }
  const current = generation;
  const report = (status: EyeSpeechStatus) => {
    if (current === generation) onStatus(status);
  };
  report("queued");
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    utterance.onstart = () => report("speaking");
    utterance.onend = () => report("spoken");
    utterance.onerror = () => report("error");
    window.speechSynthesis.speak(utterance);
  } catch {
    report("error");
  }
}

export function stopSpeaking(): void {
  generation++;
  if (!canSpeak()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* nothing to stop */
  }
}
