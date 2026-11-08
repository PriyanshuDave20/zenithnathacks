"use client";

// Webcam gaze control for the whole site (ICU stretch feature), mounted once in the root layout.
// Opt-in only: nothing happens until the small edge toggle is pressed. While enabled, an on-page
// gaze cursor follows where the user is looking; holding it still on a control for 2 s activates
// it (dwell-to-select). Camera frames are processed on the device only (src/lib/input/gaze) and
// are never uploaded, stored, or logged. Nothing here modifies the page: the cursor, calibration
// and status layers are pointer-events-none, so the site behaves exactly as before when gaze is off.

import { useCallback, useEffect, useRef, useState } from "react";
import { DwellController } from "@/lib/input/gaze/dwell";
import {
  applyGazeMapping,
  FeatureSmoother,
  fitGazeMapping,
  gazeFeatures,
  median,
  SmoothedPoint,
  type CalibrationSample,
  type GazeFeatures,
  type GazeMapping,
} from "@/lib/input/gaze/gaze-math";
import { GazeTracker } from "@/lib/input/gaze/tracker";

type Phase = "off" | "starting" | "calibrating" | "on" | "error";

const RING_C = 2 * Math.PI * 22;
/** Calibration targets as fractions of the viewport, in visiting order (a perimeter after the centre). */
const CALIBRATION_POINTS: [number, number][] = [
  [0.5, 0.5],
  [0.12, 0.14],
  [0.5, 0.14],
  [0.88, 0.14],
  [0.88, 0.5],
  [0.88, 0.86],
  [0.5, 0.86],
  [0.12, 0.86],
  [0.12, 0.5],
];
const CALIBRATION_HOLD_MS = 1300;
const CALIBRATION_SETTLE_MS = 350; // the eye is still travelling to a fresh dot; sample only after this
const CALIBRATION_MIN_SAMPLES = 6; // fewer inferences than this in a hold: skip the point
const EDGE_ZONE = 88; // px band at the top/bottom edge that scrolls the page
const NO_FACE_MS = 2500;
const BLINK_GRACE_MS = 350; // a dropped prediction shorter than this holds the last gaze point

/** Elements a gaze dwell may activate. Kept broad so the whole site works, not one page. */
const INTERACTIVE = [
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "summary",
  "label",
  "[role='button']",
  "[role='tab']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='switch']",
  "[role='option']",
  "[role='menuitem']",
  "[role='link']",
  "[tabindex]:not([tabindex='-1'])",
  "[data-gaze-target]",
].join(", ");

function selectableTarget(el: Element | null): Element | null {
  if (!el || el.closest("[data-gaze-ignore]")) return null;
  return el.closest(INTERACTIVE);
}

/** One stare = one activation: the full pointer + click sequence, as a real press would bubble. */
function activate(el: Element, x: number, y: number) {
  const init: MouseEventInit = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, view: window, button: 0 };
  if (typeof PointerEvent === "function") {
    el.dispatchEvent(new PointerEvent("pointerdown", init));
    el.dispatchEvent(new PointerEvent("pointerup", init));
  }
  el.dispatchEvent(new MouseEvent("mousedown", init));
  el.dispatchEvent(new MouseEvent("mouseup", init));
  el.dispatchEvent(new MouseEvent("click", init));
}

function cameraDenied(e: unknown) {
  return e instanceof DOMException && ["NotAllowedError", "NotFoundError", "NotReadableError", "SecurityError"].includes(e.name);
}

export function GazeLayer() {
  const [phase, setPhase] = useState<Phase>("off");
  const [status, setStatus] = useState<string | null>(null);
  const [noFace, setNoFace] = useState(false);
  const [unstable, setUnstable] = useState(false);
  const [calibIndex, setCalibIndex] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<SVGCircleElement | null>(null);
  const trackerRef = useRef<GazeTracker | null>(null);
  const dwellRef = useRef(new DwellController());
  // Two smoothing stages: the raw features wobble most (and the mapping magnifies it), so they
  // get the steadier filter; the pixel filter just takes the residual edge off.
  const featureSmootherRef = useRef(new FeatureSmoother(0.3, 0.75, 0.06));
  const smootherRef = useRef(new SmoothedPoint(0.2, 0.55, 0.02, 2));
  const mappingRef = useRef<GazeMapping | null>(null);
  const calibBufferRef = useRef<GazeFeatures[]>([]);
  const samplesRef = useRef<CalibrationSample[]>([]);
  const calibHoldStartRef = useRef(0);
  const elementKeysRef = useRef(new WeakMap<Element, number>());
  const nextKeyRef = useRef(1);
  const noFaceRef = useRef(false);
  const unstableRef = useRef(false);

  const active = phase === "calibrating" || phase === "on";

  const enable = useCallback(async () => {
    setPhase("starting");
    setStatus("Gaze is starting - allow the camera and keep this tab visible.");
    setNoFace(false);
    setCalibIndex(0);
    samplesRef.current = [];
    calibBufferRef.current = [];
    calibHoldStartRef.current = performance.now();
    if (!trackerRef.current) trackerRef.current = new GazeTracker();
    try {
      await trackerRef.current.start(videoRef.current!);
      setStatus(null);
      setPhase("calibrating");
    } catch (e) {
      trackerRef.current.stop();
      setStatus(
        cameraDenied(e)
          ? "Camera access is needed for gaze control. Allow the camera, then try again."
          : "Gaze could not start. Its face model downloads once over the network - check the connection, then try again.",
      );
      setPhase("error");
    }
  }, []);

  const disable = useCallback(() => {
    trackerRef.current?.stop();
    dwellRef.current = new DwellController();
    smootherRef.current.reset();
    mappingRef.current = null;
    setStatus(null);
    setNoFace(false);
    setPhase("off");
  }, []);

  const skipCalibration = useCallback(() => {
    mappingRef.current = null; // default mirrored mapping
    setPhase("on");
  }, []);

  // The camera must go out when the layer unmounts, whatever the phase.
  useEffect(() => () => trackerRef.current?.stop(), []);

  // Calibration: visit each target, harvest the median features seen while looking at it.
  // (Buffers and the target index reset in enable(); this effect only schedules the visits.)
  useEffect(() => {
    if (phase !== "calibrating") return;
    const timers: number[] = [];
    for (let i = 0; i <= CALIBRATION_POINTS.length; i++) {
      timers.push(
        window.setTimeout(() => {
          if (i > 0) {
            const buf = calibBufferRef.current;
            if (buf.length >= CALIBRATION_MIN_SAMPLES) {
              const mx = median(buf.map((f) => f.x));
              const my = median(buf.map((f) => f.y));
              const ma = median(buf.map((f) => f.a));
              const mp = median(buf.map((f) => f.p));
              if (mx !== null && my !== null && ma !== null && mp !== null) {
                const [sx, sy] = CALIBRATION_POINTS[i - 1];
                samplesRef.current.push({ features: { x: mx, y: my, a: ma, p: mp }, screen: { x: sx, y: sy } });
              }
            }
          }
          if (i === CALIBRATION_POINTS.length) {
            mappingRef.current = fitGazeMapping(samplesRef.current); // null falls back to the default mapping
            featureSmootherRef.current.reset();
            smootherRef.current.reset();
            setPhase("on");
          } else {
            calibBufferRef.current = [];
            calibHoldStartRef.current = performance.now();
            setCalibIndex(i);
          }
        }, 400 + i * CALIBRATION_HOLD_MS),
      );
    }
    return () => timers.forEach((t) => clearTimeout(t));
  }, [phase]);

  // The render loop: face landmarks -> gaze point -> cursor -> dwell -> activation.
  useEffect(() => {
    if (phase !== "calibrating" && phase !== "on") return;
    const dwell = dwellRef.current;
    const featureSmoother = featureSmootherRef.current;
    const smoother = smootherRef.current;
    smoother.reset();
    featureSmoother.reset();
    let raf = 0;
    let last = performance.now();
    let lastFeatureAt = last;
    let lastSmoothed: GazeFeatures | null = null;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(now - last, 250);
      last = now;

      const landmarks = trackerRef.current?.detect(now) ?? null;
      const features = gazeFeatures(landmarks);
      if (features) {
        lastFeatureAt = now;
        if (noFaceRef.current) {
          noFaceRef.current = false;
          setNoFace(false);
        }
        if (unstableRef.current) {
          unstableRef.current = false;
          setUnstable(false);
        }
      } else if (phase === "on" && !noFaceRef.current && now - lastFeatureAt > NO_FACE_MS) {
        noFaceRef.current = true;
        setNoFace(true);
      }
      if (trackerRef.current?.unhealthy && !unstableRef.current) {
        unstableRef.current = true;
        setUnstable(true);
      }

      const cursor = cursorRef.current;
      if (phase === "calibrating") {
        // Skip the settle window: right after a dot appears the eye is still travelling to it.
        if (features && now - calibHoldStartRef.current >= CALIBRATION_SETTLE_MS) calibBufferRef.current.push(features);
        return;
      }
      if (!cursor) return;

      // Blink grace: a dropped prediction for a moment (a blink) holds the last known gaze
      // instead of snapping the cursor and resetting the dwell; past the grace it is lost.
      const held = !features && lastSmoothed && now - lastFeatureAt <= BLINK_GRACE_MS;
      if (!features && !held) {
        lastSmoothed = null;
        dwell.update(now, null);
        cursor.style.opacity = "0.25";
        ringRef.current?.style.setProperty("stroke-dashoffset", String(RING_C));
        return;
      }

      const smoothed = features ? featureSmoother.next(features, dt) : lastSmoothed!;
      if (features) lastSmoothed = smoothed;
      const point = applyGazeMapping(mappingRef.current, smoothed);
      const x = point.x * window.innerWidth;
      const y = point.y * window.innerHeight;
      const p = smoother.next({ x, y }, dt);
      cursor.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
      cursor.style.opacity = "1";

      const target = selectableTarget(document.elementFromPoint(p.x, p.y));
      let key: string | null = null;
      if (target) {
        let k = elementKeysRef.current.get(target);
        if (!k) {
          k = nextKeyRef.current++;
          elementKeysRef.current.set(target, k);
        }
        key = String(k);
      }
      const state = dwell.update(now, key);

      if (ringRef.current) ringRef.current.style.strokeDashoffset = String(RING_C * (1 - state.progress));

      // Gaze scrolling: rest the gaze in the top or bottom band to move the page, but only
      // while it is not resting on a control (a dwell there means "press", not "scroll").
      if (!state.target) {
        const h = window.innerHeight;
        let v = 0;
        if (p.y < EDGE_ZONE) v = -1100 * (1 - p.y / EDGE_ZONE);
        else if (p.y > h - EDGE_ZONE) v = 1100 * (1 - (h - p.y) / EDGE_ZONE);
        if (v) window.scrollBy(0, (v * dt) / 1000);
      }

      if (state.progress >= 1 && target && key) {
        activate(target, p.x, p.y);
        dwell.fired(now);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const toggleLabel = active ? "Turn off gaze control" : "Turn on gaze control (webcam)";

  return (
    <>
      {/* Always present so the ref is stable; it carries no stream until gaze is enabled. */}
      <video ref={videoRef} aria-hidden="true" muted playsInline autoPlay className="pointer-events-none fixed left-0 top-0 size-px opacity-0" />

      {active ? (
        <div
          ref={cursorRef}
          aria-hidden="true"
          className="pointer-events-none fixed left-0 top-0 z-[70] will-change-transform"
          style={{ opacity: 0, transition: "opacity 300ms" }}
        >
          <svg width="72" height="72" viewBox="0 0 72 72" className="-ml-9 -mt-9 block drop-shadow-[0_1px_4px_rgb(16_30_52/0.35)]">
            <circle cx="36" cy="36" r="22" fill="none" className="stroke-white/70" strokeWidth="3" />
            <circle
              ref={ringRef}
              cx="36"
              cy="36"
              r="22"
              fill="none"
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C}
              transform="rotate(-90 36 36)"
              className="stroke-blue-deep"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <circle cx="36" cy="36" r="7" className="fill-blue-deep stroke-white" strokeWidth="2.5" />
          </svg>
        </div>
      ) : null}

      {phase === "calibrating" ? (
        <div role="dialog" aria-label="Gaze calibration" className="fixed inset-0 z-[70] bg-navy/90 text-white">
          <p className="mx-auto mt-[max(6rem,14svh)] max-w-sm px-6 text-center text-lg font-semibold leading-snug">
            Look at each dot until it moves on. Rest your head as you would while using the site.
          </p>
          {CALIBRATION_POINTS.map(([fx, fy], i) => (
            <span
              key={i}
              aria-hidden="true"
              className={`absolute grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full ${i === calibIndex ? "" : "invisible"}`}
              style={{ left: `${fx * 100}%`, top: `${fy * 100}%` }}
            >
              <span className="absolute inset-0 animate-ping rounded-full bg-blue/40 motion-reduce:animate-none" />
              <span className="size-5 rounded-full bg-blue ring-4 ring-white/80" />
            </span>
          ))}
          <button
            type="button"
            onClick={skipCalibration}
            className="press absolute bottom-10 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-6 py-3 text-base font-semibold text-white hover:bg-white/20"
          >
            Skip calibration
          </button>
        </div>
      ) : null}

      {status || (phase === "on" && (noFace || unstable)) ? (
        <p
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed end-2 top-[calc(50%+3.5rem)] z-[70] max-w-48 rounded-field bg-surface p-3 text-sm font-medium leading-snug text-ink shadow-soft ring-1 ring-line"
        >
          {status ?? (unstable ? "Tracking is struggling - try brighter, even lighting." : "No face seen - sit centred in front of the camera.")}
        </p>
      ) : null}

      <button
        type="button"
        onClick={active || phase === "starting" ? disable : enable}
        aria-pressed={active}
        aria-label={toggleLabel}
        title="Gaze control (webcam)"
        className={`press fixed end-2 top-1/2 z-[70] grid size-11 -translate-y-1/2 place-items-center rounded-full shadow-soft ring-1 motion-reduce:transition-none ${
          active ? "bg-blue-deep text-white ring-blue-deep" : "bg-surface/95 text-ink-soft ring-line hover:text-ink"
        }`}
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
          <circle cx="12" cy="12" r="2.75" />
        </svg>
      </button>
    </>
  );
}
