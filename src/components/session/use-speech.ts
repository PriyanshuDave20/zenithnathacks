"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type SetStateAction } from "react";
import { createSpeechPlayback, type SpeechPlaybackState } from "./speech-playback";
import { createCloudSpeech, loadSpeechMetadata, speechMetadata, type SpeechOptions } from "./cloud-speech";

// Minimal typing for the Web Speech API (not in the TS DOM lib everywhere).
type RecognitionResultList = { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: RecognitionResultList }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

const noop = () => () => {};

/** Speech-to-text in the patient's language. Audio is handled by the browser; nothing is stored. */
export function useRecognition(lang: string) {
  const supported = useSyncExternalStore(noop, () => Boolean(getCtor()), () => false);
  const [listening, setListening] = useState(false);
  const [finalText, setFinalTextState] = useState("");
  const finalRef = useRef("");
  const interimRef = useRef("");
  const listeningRef = useRef(false);
  const completion = useRef<{ resolve: (text: string) => void; timer: ReturnType<typeof setTimeout> } | null>(null);
  const setFinalText = useCallback((value: SetStateAction<string>) => {
    finalRef.current = typeof value === "function" ? value(finalRef.current) : value;
    setFinalTextState(finalRef.current);
  }, []);
  const snapshot = useCallback(() => [finalRef.current, interimRef.current].filter(Boolean).join(" ").trim(), []);
  const settle = useCallback((text: string) => {
    const pending = completion.current;
    if (pending) { clearTimeout(pending.timer); completion.current = null; pending.resolve(text); }
  }, []);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);

  const stop = useCallback(() => {
    rec.current?.stop();
  }, []);

  const clear = useCallback(() => {
    const current = rec.current;
    if (current) {
      current.onresult = null;
      current.onend = null;
      current.onerror = null;
      current.abort();
    }
    rec.current = null;
    listeningRef.current = false;
    interimRef.current = "";
    settle("");
    setListening(false);
    setFinalText("");
    setInterim("");
    setError(null);
  }, [setFinalText, settle]);

  /** Wait for the browser's final result; preserve the displayed draft if it never arrives. */
  const finish = useCallback((): Promise<string> => {
    if (!rec.current || !listeningRef.current) return Promise.resolve(snapshot());
    return new Promise(resolve => {
      const timer = setTimeout(() => {
        const text = snapshot();
        const current = rec.current;
        if (current) { current.onresult = null; current.onend = null; current.onerror = null; current.abort(); }
        rec.current = null;
        listeningRef.current = false;
        interimRef.current = "";
        setFinalText(text);
        setInterim("");
        setListening(false);
        settle(text);
      }, 1200);
      completion.current = { resolve, timer };
      try { rec.current?.stop(); } catch { settle(snapshot()); }
    });
  }, [snapshot, setFinalText, settle]);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) {
      setError("unsupported");
      return;
    }
    const previous = rec.current;
    if (previous) { previous.onresult = null; previous.onend = null; previous.onerror = null; previous.abort(); }
    const r = new Ctor();
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      if (rec.current !== r) return;
      let fin = "";
      let int = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) fin += res[0].transcript;
        else int += res[0].transcript;
      }
      if (fin) setFinalText((t) => (t ? `${t} ${fin.trim()}` : fin.trim()));
      interimRef.current = int;
      setInterim(int);
    };
    r.onerror = (e) => {
      if (rec.current !== r) return;
      setError(e.error);
      listeningRef.current = false;
      setListening(false);
      settle(snapshot());
    };
    r.onend = () => {
      if (rec.current !== r) return;
      const text = snapshot();
      setFinalText(text);
      interimRef.current = "";
      listeningRef.current = false;
      setListening(false);
      setInterim("");
      r.onresult = null;
      settle(text);
    };
    rec.current = r;
    setError(null);
    listeningRef.current = true;
    setListening(true);
    try {
      r.start();
    } catch {
      listeningRef.current = false;
      setListening(false);
      setError("start-failed");
    }
  }, [lang, setFinalText, snapshot, settle]);

  useEffect(() => () => {
    const current = rec.current;
    if (current) { current.onresult = null; current.onend = null; current.onerror = null; current.abort(); }
    settle("");
  }, [settle]);

  return { supported, listening, finalText, setFinalText, interim, error, start, stop, clear, finish };
}

/** Text-to-speech (read-aloud and speaking for patients who cannot speak). */
export function useSpeak() {
  const supported = useSyncExternalStore(
    noop,
    () => typeof window !== "undefined" && ("speechSynthesis" in window || "Audio" in window),
    () => false,
  );
  const [state, setState] = useState<SpeechPlaybackState>({ speaking: false, status: null });
  const playback = useRef<ReturnType<typeof createCloudSpeech> | null>(null);

  const speak = useCallback((text: string, lang: string, options?: SpeechOptions) => {
    playback.current?.speak(text, lang, options);
  }, []);
  const stop = useCallback(() => playback.current?.stop(), []);

  useEffect(() => {
    void loadSpeechMetadata();
    const local = "speechSynthesis" in window
      ? createSpeechPlayback(window.speechSynthesis, text => new SpeechSynthesisUtterance(text), setState)
      : { speak() { setState({ speaking: false, status: "voice-unavailable" }); }, stop() {}, dispose() {} };
    const current = createCloudSpeech(local, setState, {
      fetch: window.fetch.bind(window), makeAudio: () => new Audio(),
      createUrl: blob => URL.createObjectURL(blob), revokeUrl: url => URL.revokeObjectURL(url), metadata: speechMetadata,
    });
    playback.current = current;
    return () => { current.dispose(); playback.current = null; };
  }, []);

  return { supported, ...state, speak, stop };
}
