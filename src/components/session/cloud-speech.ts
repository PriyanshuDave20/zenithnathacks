import { publicSpeechCatalog } from "../../lib/questions/speech-catalog";
import type { SpeechPlaybackState } from "./speech-playback";

export type SpeechOptions = { kind?: "dynamic" | "public" };
type Clip = { id: string; language: string; text: string; src: string };
export type SpeechMetadata = { provider: "azure" | "browser"; clips: Clip[] };
type LocalPlayback = { speak(text: string, language: string): void; stop(): void; dispose(): void };
type AudioPlayback = Pick<HTMLAudioElement, "src" | "play" | "pause" | "onended" | "onerror">;

const metadata: SpeechMetadata = { provider: "browser", clips: [] };
let loading: Promise<void> | undefined;
/** This cache holds only provider capabilities and checked-in public UI wording, never session content. */
export function loadSpeechMetadata(): Promise<void> {
  return loading ??= Promise.allSettled([
    fetch("/api/speech", { cache: "no-store", credentials: "omit", signal: AbortSignal.timeout(5000) })
      .then(response => response.ok ? response.json() : undefined)
      .then(value => { if (value?.provider === "azure") metadata.provider = "azure"; }),
    fetch("/speech/manifest.json", { cache: "no-store", credentials: "omit", signal: AbortSignal.timeout(5000) })
      .then(response => response.ok ? response.json() : undefined)
      .then(value => { if (value?.schemaVersion === 1 && Array.isArray(value.clips)) metadata.clips = value.clips; }),
  ]).then(() => {});
}

function languageKey(language: string): string | undefined {
  try {
    const locale = new Intl.Locale(language);
    if (["en", "es", "ar"].includes(locale.language)) return locale.language;
    if (["zh", "cmn"].includes(locale.language) && locale.script !== "Hant"
      && !["HK", "MO"].includes(locale.region ?? "")) return "zh-Hans";
  } catch { /* Do not echo invalid locale values. */ }
}

export function publicSpeechClip(text: string, language: string, clips: Clip[]): string | undefined {
  const key = languageKey(language);
  const source = publicSpeechCatalog().find(entry => entry.language === key && entry.text === text);
  if (!source) return undefined;
  const clip = clips.find(entry => entry?.id === source.id && entry.language === key && entry.text === source.text);
  return clip && /^\/speech\/(?:en|es|ar|zh-Hans)-[a-f0-9]{64}\.mp3$/.test(clip.src) ? clip.src : undefined;
}

let stopActive: (() => void) | undefined;

/** Own a single in-memory audio request across hooks; stale requests can never start playback. */
export function createCloudSpeech(
  local: LocalPlayback,
  update: (state: SpeechPlaybackState) => void,
  dependencies: {
    fetch: typeof fetch;
    makeAudio: () => AudioPlayback;
    createUrl: (blob: Blob) => string;
    revokeUrl: (url: string) => void;
    metadata: () => SpeechMetadata;
  },
) {
  let audio: AudioPlayback | undefined;
  let objectUrl: string | undefined;
  let request: AbortController | undefined;
  let version = 0;
  let disposed = false;
  let ready: { text: string; language: string } | undefined;
  let retryBrowser = false;

  const emit = (status: SpeechPlaybackState["status"], speaking = false) => {
    if (!disposed) update({ speaking, status });
  };
  const releaseAudio = () => {
    ready = undefined;
    if (audio) { audio.onended = null; audio.onerror = null; audio.pause(); audio.src = ""; audio = undefined; }
    if (objectUrl) { dependencies.revokeUrl(objectUrl); objectUrl = undefined; }
  };
  const stop = () => {
    version++;
    request?.abort(); request = undefined;
    releaseAudio();
    retryBrowser = false;
    local.stop();
    if (stopActive === stop) stopActive = undefined;
    emit(null);
  };
  const fallback = () => {
    version++;
    releaseAudio();
    retryBrowser = true;
    // Browser speech also needs a user gesture in Safari: never silently queue it after await.
    emit("browser-ready");
  };
  const play = (token: number, text: string, language: string) => {
    const current = audio!;
    current.onended = () => {
      if (version !== token) return;
      version++;
      releaseAudio();
      if (stopActive === stop) stopActive = undefined;
      emit(null);
    };
    current.onerror = () => { if (version === token) fallback(); };
    emit(null, true);
    try {
      void current.play().catch((error: unknown) => {
        if (version !== token || disposed) return;
        if (error instanceof Error && error.name === "NotAllowedError") {
          ready = { text, language };
          emit("audio-ready");
        } else fallback();
      });
    } catch { if (version === token) fallback(); }
  };

  return {
    stop,
    speak(text: string, language: string, options: SpeechOptions = {}) {
      if (disposed || !text.trim()) return;
      if (ready && ready.text === text && ready.language === language && audio) {
        ready = undefined;
        play(version, text, language);
        return;
      }
      const useBrowser = retryBrowser;
      stopActive?.();
      stop();
      stopActive = stop;
      const token = version;
      const settings = dependencies.metadata();
      const clip = options.kind === "public" ? publicSpeechClip(text, language, settings.clips) : undefined;
      if (useBrowser || (!clip && (options.kind === "public" || settings.provider !== "azure" || !languageKey(language)))) {
        local.speak(text, language);
        return;
      }
      audio = dependencies.makeAudio();
      if (clip) { audio.src = clip; play(token, text, language); return; }
      request = new AbortController();
      emit("loading-audio");
      void dependencies.fetch("/api/speech", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }), cache: "no-store", credentials: "omit",
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(10000)]),
      }).then(async response => {
        if (!response.ok || !response.headers.get("Content-Type")?.startsWith("audio/mpeg")) throw new Error();
        const blob = await response.blob();
        if (!blob.size || blob.size > 2_000_000) throw new Error();
        if (version !== token || disposed) return;
        request = undefined;
        objectUrl = dependencies.createUrl(blob);
        audio!.src = objectUrl;
        play(token, text, language);
      }).catch(() => { if (version === token && !disposed) { request = undefined; fallback(); } });
    },
    dispose() { stop(); disposed = true; local.dispose(); },
  };
}

export const speechMetadata = () => metadata;
