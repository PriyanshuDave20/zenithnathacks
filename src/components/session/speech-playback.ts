export type SpeechPlaybackStatus = "loading-voices" | "voice-ready" | "voice-unavailable" | "playback-failed" | "loading-audio" | "audio-ready" | "browser-ready" | null;
export type SpeechPlaybackState = { speaking: boolean; status: SpeechPlaybackStatus };

const locale = (tag: string) => tag.toLowerCase().replace(/_/g, "-");

/** Prefer an installed local voice; never let an unrelated default read another language. */
export function selectSpeechVoice(voices: SpeechSynthesisVoice[], language: string): SpeechSynthesisVoice | undefined {
  const requested = locale(language);
  const base = requested.split("-")[0];
  const compatible = voices.filter((voice) => {
    const tag = locale(voice.lang);
    if (base === "zh") {
      // The app's Chinese language is Mandarin. Cantonese is a separate spoken language.
      return /^(?:cmn(?:-|$)|zh(?:$|-(?:cmn|hans|hant|cn|tw|sg)(?:-|$)))/.test(tag) && !/(?:^|-)(hk|mo|yue)(?:-|$)/.test(tag);
    }
    return tag.split("-")[0] === base;
  });
  const score = (voice: SpeechSynthesisVoice) =>
    (voice.localService ? 100 : 0) +
    (locale(voice.lang) === requested ? 20 : 0) +
    (base === "zh" && /(?:^|-)(cn|hans|sg)(?:-|$)/.test(locale(voice.lang)) ? 10 : 0) +
    (voice.default ? 1 : 0);
  return compatible.sort((a, b) => score(b) - score(a))[0];
}

// Only the owner may cancel its playback during unmount. Other read-aloud buttons
// can mount/unmount alongside it without cutting off the active utterance.
const owners = new WeakMap<SpeechSynthesis, () => void>();

export function createSpeechPlayback(
  synthesis: SpeechSynthesis,
  makeUtterance: (text: string) => SpeechSynthesisUtterance,
  update: (state: SpeechPlaybackState) => void,
) {
  let utterance: SpeechSynthesisUtterance | null = null;
  let waitingLanguage: string | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  const emit = (status: SpeechPlaybackStatus, speaking = false) => {
    if (!disposed) update({ speaking, status });
  };
  const clearTimer = () => { clearTimeout(timer); timer = undefined; };
  const release = () => {
    clearTimer();
    if (utterance) utterance.onstart = utterance.onend = utterance.onerror = null;
    utterance = null;
    if (owners.get(synthesis) === stop) owners.delete(synthesis);
  };
  const stop = () => { release(); emit(null); };
  const voicesChanged = () => {
    if (!waitingLanguage || disposed) return;
    try {
      if (selectSpeechVoice(synthesis.getVoices(), waitingLanguage)) {
        waitingLanguage = null;
        clearTimer();
        // Safari requires playback from a user gesture: ask for another tap.
        emit("voice-ready");
      }
    } catch { waitingLanguage = null; clearTimer(); emit("playback-failed"); }
  };
  const reset = () => {
    waitingLanguage = null;
    const ownsPlayback = owners.get(synthesis) === stop;
    release();
    if (ownsPlayback) synthesis.cancel();
    emit(null);
  };
  synthesis.addEventListener("voiceschanged", voicesChanged);
  // Trigger lazy voice discovery before the first press, without playing audio.
  try { synthesis.getVoices(); } catch { /* Retry from the user's press. */ }

  return {
    stop: reset,
    speak(text: string, language: string) {
      if (disposed || !text.trim()) return;
      waitingLanguage = null;
      clearTimer();
      owners.get(synthesis)?.();
      try {
        synthesis.cancel();
        const voices = synthesis.getVoices();
        const voice = selectSpeechVoice(voices, language);
        if (!voice) {
          if (voices.length) { emit("voice-unavailable"); return; }
          waitingLanguage = language;
          emit("loading-voices");
          timer = setTimeout(() => {
            voicesChanged();
            if (waitingLanguage) { waitingLanguage = null; emit("voice-unavailable"); }
          }, 1500);
          return;
        }
        const next = makeUtterance(text);
        utterance = next; // Keep a strong reference until end/error/cancellation.
        next.voice = voice;
        next.lang = voice.lang.replace(/_/g, "-");
        next.rate = 0.92;
        owners.set(synthesis, stop);
        next.onstart = () => { if (utterance === next) clearTimer(); };
        next.onend = () => { if (utterance === next) { release(); emit(null); } };
        next.onerror = (event) => {
          if (utterance !== next) return;
          release();
          emit(event.error === "canceled" || event.error === "interrupted" ? null : "playback-failed");
        };
        emit(null, true);
        // A browser can accept speak() but never start (e.g. an unavailable asset).
        timer = setTimeout(() => {
          if (utterance !== next) return;
          release();
          synthesis.cancel();
          emit("playback-failed");
        }, 10000);
        if (synthesis.paused) synthesis.resume();
        synthesis.speak(next);
      } catch { release(); emit("playback-failed"); }
    },
    dispose() {
      disposed = true;
      reset();
      synthesis.removeEventListener("voiceschanged", voicesChanged);
    },
  };
}
