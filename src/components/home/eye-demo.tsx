"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Check, PictoYes, PictoNo, PictoPain, PictoHelp, Handoff, Shield } from "./icons";

const CHOICES = [
  { label: "Yes", Icon: PictoYes }, { label: "No", Icon: PictoNo },
  { label: "Pain", Icon: PictoPain }, { label: "Help", Icon: PictoHelp },
  { label: "Move me", Icon: Handoff }, { label: "Take a break", Icon: Shield },
];
const SEQUENCE = [2, 0, 5];

/** Scripted illustration only. Never feeds the real input channel or accesses a camera. */
export function EyeDemo({ compact, onChoice }: { compact: boolean; onChoice: (choice: string) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [time, setTime] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const announce = useEffectEvent(onChoice);

  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const size = matchMedia("(min-width: 1024px)");
    let visible = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const sync = () => {
      clearInterval(timer);
      setReduced(motion.matches);
      if (visible && !document.hidden && size.matches === compact && !paused && !motion.matches) {
        timer = setInterval(() => setTime(t => t + 100), 100);
      }
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    if (root.current) observer.observe(root.current);
    motion.addEventListener("change", sync);
    size.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      clearInterval(timer);
      observer.disconnect();
      motion.removeEventListener("change", sync);
      size.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [compact, paused]);

  const turn = Math.floor(time / 6000) % SEQUENCE.length;
  const phase = time % 6000;
  const target = SEQUENCE[turn];
  const previous = SEQUENCE[(turn + SEQUENCE.length - 1) % SEQUENCE.length];
  const progress = reduced ? 1 : Math.max(0, Math.min(1, (phase - 1000) / 2000));
  const confirmed = reduced || phase >= 3000;
  const choice = CHOICES[target].label;
  useEffect(() => {
    if (confirmed) announce(choice);
  }, [confirmed, choice]);
  const position = (index: number) => ({ x: index % 2 ? 75 : 25, y: (Math.floor(index / 2) + 0.5) * 100 / 3 });
  const from = position(previous), to = position(target);
  const travel = reduced ? 1 : Math.min(1, phase / 1000);
  const ease = travel * travel * (3 - 2 * travel);

  return (
    <div ref={root} data-gaze-ignore className="flex flex-col gap-3">
      <p className="font-display text-xl font-bold">What would you like to say?</p>
      <p className="text-sm text-ink-soft">{reduced ? `Example · ${choice} selected by gaze` : confirmed ? "Message confirmed" : phase < 1000 ? "Looking toward a choice…" : "Hold your gaze to choose…"}</p>
      <div className="relative grid grid-cols-2 gap-2" role="img" aria-label={`Simulated eye communication board. ${confirmed ? choice + " selected." : "Gaze moving to " + choice + "."}`}>
        {CHOICES.map(({ label, Icon }, index) => (
          <div key={label} className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl p-2 text-sm font-semibold ${confirmed && index === target ? "bg-blue-deep text-white" : "bg-surface text-ink ring-1 ring-line"}`}>
            <Icon size={26} /><span>{label}</span>
            {confirmed && index === target ? <Check size={12} /> : null}
          </div>
        ))}
        <span aria-hidden="true" className="pointer-events-none absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 shadow-sm" style={{ left: `${from.x + (to.x - from.x) * ease}%`, top: `${from.y + (to.y - from.y) * ease}%`, transition: reduced ? "none" : "left 100ms linear, top 100ms linear", background: `conic-gradient(#2d5f8b ${progress * 360}deg, #d5e0eb 0deg)` }}>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white"><span className="h-1.5 w-1.5 rounded-full bg-blue-deep" /></span>
        </span>
      </div>
      <p className="rounded-2xl bg-blue-soft p-3 text-sm font-semibold text-blue-deeper">{confirmed ? `You chose: ${choice}` : "Look at a choice. Hold for two seconds."}</p>
      <div className="flex items-center justify-between gap-2 text-sm text-ink-soft">
        <span>Simulated gaze · No camera</span>
        {!reduced ? <button type="button" aria-pressed={paused} onClick={() => setPaused(p => !p)} className="min-h-11 rounded-full px-3 font-semibold underline underline-offset-4">{paused ? "Play demo" : "Pause demo"}</button> : null}
      </div>
    </div>
  );
}
