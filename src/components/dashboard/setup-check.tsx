"use client";

import { useState } from "react";
import { Check } from "@/components/home/icons";
import { canSpeak, speakAloud } from "@/lib/eye/speak";

type Result = { id: string; label: string; ok: boolean; detail: string };

async function tryDevice(kind: "video" | "audio"): Promise<{ ok: boolean; detail: string }> {
  if (!navigator.mediaDevices?.getUserMedia) return { ok: false, detail: "This browser cannot reach a " + (kind === "video" ? "camera" : "microphone") + "." };
  try {
    // The browser may be waiting for someone to answer its permission question: do not wait forever.
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new DOMException("No answer", "TimeoutError")), 8000));
    const request = navigator.mediaDevices.getUserMedia(kind === "video" ? { video: true } : { audio: true });
    request.then((late) => { if (late.active) late.getTracks().forEach((track) => track.stop()); }, () => {}); // never leave one open
    const stream = await Promise.race([request, timeout]);
    stream.getTracks().forEach((track) => track.stop()); // opened and closed at once: nothing is recorded or kept
    return { ok: true, detail: "Allowed and working." };
  } catch (error) {
    const name = error instanceof DOMException ? error.name : "";
    if (name === "NotAllowedError" || name === "SecurityError") return { ok: false, detail: "Blocked. Allow it for this site in the browser’s settings, then check again." };
    if (name === "NotFoundError" || name === "OverconstrainedError") return { ok: false, detail: "None found. Plug one in or check it is not turned off." };
    if (name === "TimeoutError") return { ok: false, detail: "No answer yet. Choose Allow when the browser asks, then check again." };
    if (name === "NotReadableError") return { ok: false, detail: "Another app is using it. Close that app and check again." };
    return { ok: false, detail: "Could not be opened." };
  }
}

async function runChecks(): Promise<Result[]> {
  const camera = await tryDevice("video");
  const microphone = await tryDevice("audio");
  const voices = canSpeak() ? window.speechSynthesis.getVoices().length : 0;
  return [
    { id: "secure", label: "Secure connection", ok: window.isSecureContext, detail: window.isSecureContext ? "The camera and microphone can be used." : "Camera and microphone only work on a secure (https) page." },
    { id: "camera", label: "Camera (Eye mode)", ...camera },
    { id: "microphone", label: "Microphone (speaking and translating)", ...microphone },
    {
      id: "voice",
      label: "Voice (speaking aloud)",
      ok: canSpeak() && voices > 0,
      detail: !canSpeak() ? "This browser cannot speak aloud." : voices === 0 ? "No voice was found on this device." : "A voice is available. Use Play a test sentence to hear it.",
    },
    {
      id: "screen",
      label: "Screen size (Eye mode)",
      ok: window.innerWidth >= 900 && window.innerHeight >= 600,
      detail: window.innerWidth >= 900 && window.innerHeight >= 600 ? "Large enough for big choices." : "A larger screen or a bigger window works best for Eye mode.",
    },
  ];
}

/** A before-the-visit check. It runs only when pressed (never a surprise camera prompt) and keeps nothing. */
export function SetupCheck() {
  const [state, setState] = useState<"idle" | "running" | Result[]>("idle");

  async function onCheck() {
    setState("running");
    setState(await runChecks());
  }

  const results = Array.isArray(state) ? state : null;
  const attention = results?.filter((r) => !r.ok).length ?? 0;

  return (
    <section aria-labelledby="setup-title" className="mt-6 min-w-0 rounded-sheet bg-surface p-7 sm:p-8">
      <h2 id="setup-title" className="font-display text-xl font-semibold">Test my setup</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
        Check this device before a visit. The camera and microphone light may flash for a moment. Nothing is recorded or kept.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onCheck}
          disabled={state === "running"}
          className="press inline-flex min-h-12 items-center rounded-full bg-ink px-6 text-base font-semibold text-ground disabled:opacity-60"
        >
          {state === "running" ? "Checking…" : results ? "Check again" : "Check this device"}
        </button>
        <button
          type="button"
          onClick={() => speakAloud("This is a test of the voice. If you can hear this, speaking aloud is working.")}
          disabled={!canSpeak()}
          className="press inline-flex min-h-12 items-center rounded-full px-6 text-base font-semibold text-ink ring-1 ring-line disabled:opacity-50"
        >
          Play a test sentence
        </button>
      </div>
      <div aria-live="polite" className="mt-5">
        {results ? (
          <>
            <p className="text-base font-semibold">{attention === 0 ? "Everything looks ready." : attention === 1 ? "One thing needs attention." : `${attention} things need attention.`}</p>
            <ul className="mt-3 divide-y divide-line">
              {results.map((r) => (
                <li key={r.id} className="flex items-start gap-3 py-3">
                  <span aria-hidden="true" className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-sm font-bold ${r.ok ? "bg-blue-soft text-blue-deeper" : "bg-ink text-ground"}`}>
                    {r.ok ? <Check size={14} /> : "!"}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {r.label} <span className="font-normal text-ink-soft">· {r.ok ? "Ready" : "Needs attention"}</span>
                    </p>
                    <p className="mt-0.5 text-sm text-ink-soft">{r.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </section>
  );
}
