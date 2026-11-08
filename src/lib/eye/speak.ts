"use client";

// Says a sentence aloud with the browser's own voice, on this device. Nothing is sent anywhere.
// The patient cannot speak, so the app speaks for them: the room hears it, and the clinician does not
// have to take the device.

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

export function speakAloud(text: string): void {
  if (!text.trim() || !canSpeak()) return;
  try {
    window.speechSynthesis.cancel(); // the newest thing said replaces anything still being said
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  } catch {
    /* no voice available: the sentence is still shown on screen */
  }
}

export function stopSpeaking(): void {
  if (!canSpeak()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* nothing to stop */
  }
}
