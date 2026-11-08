"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { languages, summary } from "./data";
import { Bubble, ScreenBar } from "./phone";
import { Phone3D } from "./phone-3d";
import { Check, Keyboard, Mic, Pause, Play } from "./icons";

// Stage timeline for one exchange; the last stage holds before the next language starts.
const STAGE_MS = [1500, 1700, 1900, 4200];
const FINAL = STAGE_MS.length - 1;

const REDUCED = "(prefers-reduced-motion: reduce)";
function subscribeReduced(cb: () => void) {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/**
 * The hero's synthetic exchange: its timeline, the screen it plays, and its pause control.
 * Rendered by the in-flow hero phone on small screens and by the pinned phone on large ones.
 */
export function HeroDemo({
  children,
  paused = false,
}: {
  children: (screen: ReactNode, control: ReactNode, label: string) => ReactNode;
  /** Hold the timeline while the screen is not showing. */
  paused?: boolean;
}) {
  const [stage, setStage] = useState(0);
  const [lang, setLang] = useState(0);
  // null until the visitor presses the control; reduced motion starts paused on the finished exchange.
  const [userPlaying, setUserPlaying] = useState<boolean | null>(null);
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
  const playing = userPlaying ?? !reduced;
  const [onScreen, setOnScreen] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  // Pause while off screen.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || !onScreen || paused) return;
    const t = window.setTimeout(() => {
      if (stage < FINAL) setStage(stage + 1);
      else {
        setStage(0);
        setLang((l) => (l + 1) % languages.length);
      }
    }, STAGE_MS[stage]);
    return () => window.clearTimeout(t);
  }, [stage, playing, onScreen, paused]);

  const l = languages[lang];
  const shown = !playing && userPlaying === null ? FINAL : stage;

  const screen = (
    <>
      <ScreenBar holder={shown < 3 ? "Patient" : "Clinician"} step={`${l.english} · synthetic`} />
        <div className="flex flex-1 flex-col gap-3 px-4 pt-4" aria-live="polite">
          {shown === 0 ? (
            <div key={`listen-${lang}`} className="arrive mt-6 flex flex-col items-center gap-4 text-center">
              <span className="grid size-20 place-items-center rounded-full bg-blue-deep text-white shadow-lift">
                <Mic size={34} />
              </span>
              <span className="level flex h-8 items-center gap-1" aria-hidden="true">
                {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                  <span
                    key={d}
                    style={{ ["--d" as string]: d }}
                    className="h-full w-1.5 rounded-full bg-blue"
                  />
                ))}
              </span>
              <p className="text-base font-semibold text-ink">Listening in {l.english}</p>
            </div>
          ) : null}

          {shown >= 1 ? (
            <Bubble key={`said-${lang}`} tone="patient" caption={`Patient · ${l.name}`} lang={l.code} dir={l.dir} className="arrive">
              {l.said}
            </Bubble>
          ) : null}

          {shown >= 2 ? (
            <Bubble key={`back-${lang}`} tone="readback" caption="Read back to the patient" lang={l.code} dir={l.dir} className="arrive">
              {l.readBack}
            </Bubble>
          ) : null}

          {shown >= 3 ? (
            <section
              key={`sum-${lang}`}
              aria-label="Clinician summary"
              className="arrive mt-1 rounded-[1.75rem] rounded-br-[0.5rem] bg-navy p-4 text-white"
            >
              <p className="text-sm font-medium text-on-navy-soft">Clinician summary · English</p>
              <p className="mt-1 font-display text-lg font-semibold leading-snug">{summary.chiefComplaint}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl bg-navy-raised px-3 py-2">
                  <dt className="text-on-navy-soft">Duration</dt>
                  <dd className="font-semibold">{summary.duration}</dd>
                </div>
                <div className="rounded-2xl bg-navy-raised px-3 py-2">
                  <dt className="text-on-navy-soft">Red flag</dt>
                  <dd className="font-semibold text-blue">{summary.redFlag}</dd>
                </div>
              </dl>
            </section>
          ) : null}

          {shown >= 3 ? (
            <p key={`ok-${lang}`} className="arrive flex items-center justify-center gap-1.5 text-sm font-semibold text-blue-deeper">
              <Check size={16} /> Patient confirmed the read-back
            </p>
          ) : null}
        </div>
        {/* Composer: the glass ends in the app's own input bar, never in dead white */}
        <div className="px-4 pb-5 pt-3">
          <span className="flex min-h-12 min-w-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-base text-ink-soft ring-1 ring-line">
            {shown < 3 ? <Mic size={18} className="shrink-0" /> : <Keyboard size={18} className="shrink-0" />}
            <span className="truncate">{shown < 3 ? `Speak or type in ${l.english}` : "Reply to the patient"}</span>
          </span>
        </div>
    </>
  );
  const control = (
      <button
        type="button"
        onClick={() => {
          setUserPlaying(!playing);
          window.dispatchEvent(new CustomEvent("synapse:demo-playing", { detail: !playing }));
        }}
        aria-pressed={!playing}
        className="press mx-auto flex w-fit min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-blue-deeper shadow-lift hover:bg-blue-soft"
      >
        {playing ? <Pause size={18} /> : <Play size={18} />}
        {playing ? "Pause demo" : "Play demo"}
      </button>
  );
  return (
    <div ref={ref} className="relative">
      {children(screen, control, `Synthetic demo: a patient speaking ${l.english} and the clinician's summary`)}
    </div>
  );
}

/** Small screens: the hero's own phone, in the page flow. */
export function HeroExchange() {
  return (
    <HeroDemo>
      {(screen, control, label) => (
        <>
          {/* Sized so the whole exchange, summary included, lands in the first phone viewport */}
          <Phone3D label={label} className="w-[min(20.5rem,100%,calc((100svh-24rem)*0.48))]">
            {screen}
          </Phone3D>
          <div className="relative z-10 mt-4">{control}</div>
        </>
      )}
    </HeroDemo>
  );
}
