"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

const THUMB = 56; // px: a big, easy target for a finger, a pointer or a tremor

/**
 * A 0-10 style answer as one slider. Built by hand (not a native range) so it can feel right:
 *  - the thumb follows the finger 1:1 and keeps the spot where it was grabbed, then settles on the nearest step;
 *  - the number is large and sits ABOVE the track, so a finger never covers the answer;
 *  - pressing the thumb counts as answering (a patient who means 0 can say 0);
 *  - no words describe the number: pain is the patient's own, so the scale only shows the number they chose.
 * Keyboard: arrows, Home, End. Screen readers get a real slider. Motion stops under prefers-reduced-motion.
 */
export function ScaleSlider({
  value,
  onChange,
  min = 0,
  max = 10,
  label,
  locale = "en",
  unsetText = "Not chosen yet",
}: {
  value: number | null;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  label: string;
  locale?: string;
  unsetText?: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const grab = useRef(0); // where on the thumb it was held, so it does not jump to the centre
  const last = useRef<number | null>(null);
  const [drag, setDrag] = useState<number | null>(null); // 0..1 while a finger is down
  const steps = max - min;
  const fmt = (n: number) => new Intl.NumberFormat(locale).format(n);
  const toStep = (f: number) => Math.round(min + Math.min(1, Math.max(0, f)) * steps);

  const fractionAt = (clientX: number) => {
    const r = track.current?.getBoundingClientRect();
    if (!r || r.width <= THUMB) return 0;
    return Math.min(1, Math.max(0, (clientX - r.left - THUMB / 2) / (r.width - THUMB)));
  };
  const commit = (n: number) => {
    if (n === last.current) return;
    last.current = n;
    onChange(n);
    try {
      navigator.vibrate?.(6); // a light tick on each step where the device supports it
    } catch {
      /* no haptics */
    }
  };

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* pointer already gone */
    }
    const r = event.currentTarget.getBoundingClientRect();
    const now = value === null ? 0 : (value - min) / steps;
    const thumbX = r.left + THUMB / 2 + now * (r.width - THUMB);
    grab.current = Math.abs(event.clientX - thumbX) <= THUMB / 2 + 6 ? event.clientX - thumbX : 0;
    last.current = value;
    const f = fractionAt(event.clientX - grab.current);
    setDrag(f);
    commit(toStep(f));
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (drag === null) return;
    const f = fractionAt(event.clientX - grab.current);
    setDrag(f);
    commit(toStep(f));
  }
  const release = () => setDrag(null);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = value ?? min;
    const next =
      event.key === "ArrowRight" || event.key === "ArrowUp" ? (value === null ? min + 1 : current + 1)
      : event.key === "ArrowLeft" || event.key === "ArrowDown" ? current - 1
      : event.key === "PageUp" ? current + 2
      : event.key === "PageDown" ? current - 2
      : event.key === "Home" ? min
      : event.key === "End" ? max
      : null;
    if (next === null) return;
    event.preventDefault();
    onChange(Math.min(max, Math.max(min, next)));
  }

  const fraction = drag ?? (value === null ? 0 : (value - min) / steps);
  const at = `calc(${THUMB / 2}px + (100% - ${THUMB}px) * ${fraction})`;
  const answered = value !== null;
  const pressed = drag !== null;

  return (
    <div className={`ssl${pressed ? " ssl-pressed" : ""}`}>
      <style>{CSS}</style>
      <output className="ssl-number" aria-hidden="true" style={{ color: answered ? `color-mix(in srgb, var(--blue-deep), var(--navy) ${Math.round(fraction * 100)}%)` : "var(--ink-soft)", opacity: answered ? 1 : 0.4 }}>
        {answered ? fmt(value) : "–"}
      </output>
      <div
        ref={track}
        className="ssl-hit"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value ?? min}
        aria-valuetext={answered ? fmt(value) : unsetText}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
        onKeyDown={onKeyDown}
      >
        <div className="ssl-track" aria-hidden="true">
          <div className="ssl-rest" style={{ left: at }} />
          {Array.from({ length: steps + 1 }, (_, i) => (
            <span key={i} className="ssl-tick" style={{ left: `calc(${THUMB / 2}px + (100% - ${THUMB}px) * ${i / steps})` }} />
          ))}
        </div>
        <div className={`ssl-thumb${answered ? "" : " ssl-unset"}`} style={{ left: at }} aria-hidden="true" />
      </div>
      <div className="ssl-ends" dir="ltr" aria-hidden="true">
        <span>{fmt(min)}</span>
        <span>{fmt(max)}</span>
      </div>
    </div>
  );
}

// Styles live with the component (a stale page stylesheet in dev cannot unstyle it). Tokens come from globals.css.
const CSS = `
.ssl{display:flex;flex-direction:column;align-items:center;gap:18px;width:100%;max-width:34rem;margin-inline:auto;user-select:none;-webkit-user-select:none}
.ssl-number{display:block;font-family:var(--font-figtree),ui-sans-serif,system-ui,sans-serif;font-size:clamp(4.5rem,18vw,7.5rem);font-weight:700;line-height:.9;letter-spacing:-.035em;font-variant-numeric:tabular-nums;min-height:1em;transition:color 200ms,opacity 200ms}
.ssl-hit{position:relative;width:100%;height:${THUMB}px;cursor:grab;touch-action:pan-y;border-radius:999px;outline:none}
.ssl-pressed .ssl-hit{cursor:grabbing}
.ssl-hit:focus-visible{outline:3px solid var(--blue-deeper);outline-offset:6px}
.ssl-track{position:absolute;left:0;right:0;top:50%;height:18px;margin-top:-9px;border-radius:999px;overflow:hidden;background:linear-gradient(90deg,var(--blue) 0%,var(--blue-deep) 55%,var(--navy) 100%);box-shadow:inset 0 0 0 1px rgb(16 30 52 / .1)}
.ssl-rest{position:absolute;top:0;bottom:0;right:0;background:var(--blue-soft);box-shadow:inset 0 0 0 1px rgb(16 30 52 / .06);transition:left 300ms var(--ease-out)}
.ssl-tick{position:absolute;top:50%;width:4px;height:4px;margin:-2px 0 0 -2px;border-radius:50%;background:rgb(16 30 52 / .28)}
.ssl-thumb{position:absolute;top:50%;width:${THUMB}px;height:${THUMB}px;border-radius:50%;background:#fff;transform:translate(-50%,-50%);box-shadow:0 1px 2px rgb(16 30 52 / .25),0 10px 22px -8px rgb(16 30 52 / .5),0 0 0 1px rgb(16 30 52 / .08);transition:left 300ms var(--ease-out),transform 180ms var(--ease-out),box-shadow 180ms}
.ssl-thumb::after{content:"";position:absolute;inset:50% auto auto 50%;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;background:var(--navy)}
.ssl-unset{box-shadow:0 0 0 3px var(--blue),0 10px 22px -8px rgb(16 30 52 / .35)}
.ssl-unset::after{background:var(--blue)}
.ssl-pressed .ssl-thumb{transform:translate(-50%,-50%) scale(1.12);box-shadow:0 2px 4px rgb(16 30 52 / .25),0 16px 30px -8px rgb(16 30 52 / .55),0 0 0 1px rgb(16 30 52 / .08)}
.ssl-pressed .ssl-thumb,.ssl-pressed .ssl-rest{transition:transform 180ms var(--ease-out),box-shadow 180ms}
.ssl-ends{display:flex;justify-content:space-between;width:100%;padding-inline:${THUMB / 2 - 8}px;font-size:1.05rem;font-weight:600;color:var(--ink-soft);font-variant-numeric:tabular-nums}
@media (prefers-reduced-motion:reduce){.ssl-thumb,.ssl-rest,.ssl-number{transition:none!important}.ssl-pressed .ssl-thumb{transform:translate(-50%,-50%)}}
`;
