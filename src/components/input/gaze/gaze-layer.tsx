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
  SmoothedPoint,
  type CalibrationSample,
  type GazeFeatures,
  type GazeMapping,
} from "@/lib/input/gaze/gaze-math";
import { GazeTracker } from "@/lib/input/gaze/tracker";

type Phase = "off" | "starting" | "calibrating" | "on" | "error";

const RING_C = 2 * Math.PI * 22;
/** The calibration sweep: the dot moves for this long while the eye follows it. */
const CALIBRATION_MS = 30000;
/** The dot rests at the centre first, so the eye can settle before the sweep starts. */
const CALIBRATION_LEAD_MS = 800;
/** Record only while the dot is slow (sin of the eased segment phase) - the eye tracks a
 * moving target with lag, so fast-transit samples would teach a biased mapping. */
const CALIBRATION_GATE = 0.6;
/** Below this many usable samples the fit is not trusted; the default mapping stays. */
const CALIBRATION_FIT_MIN = 60;
const CALIBRATION_MAX_SAMPLES = 800;
/** How many interactive-element centres the sweep additionally visits. */
const HOTSPOT_LIMIT = 10;
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

/**
 * The sweep's route: centre first, then a pinwheel over the corners, edge midpoints and the
 * centres of up to `HOTSPOT_LIMIT` visible interactive elements ("hotspots" - the places the
 * patient will actually need to look). Angular order keeps consecutive legs long, so the path
 * covers the whole viewport instead of wigglng in one corner.
 */
function buildCalibrationWaypoints(): { x: number; y: number }[] {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const inset = 0.12;
  const pts = [
    { x: 0.5 * w, y: 0.5 * h },
    { x: inset * w, y: inset * h },
    { x: 0.5 * w, y: inset * h },
    { x: (1 - inset) * w, y: inset * h },
    { x: (1 - inset) * w, y: 0.5 * h },
    { x: (1 - inset) * w, y: (1 - inset) * h },
    { x: 0.5 * w, y: (1 - inset) * h },
    { x: inset * w, y: (1 - inset) * h },
    { x: inset * w, y: 0.5 * h },
  ];
  const picked: { x: number; y: number }[] = [];
  const minDist = 0.16 * Math.hypot(w, h);
  for (const el of Array.from(document.querySelectorAll(INTERACTIVE))) {
    if (picked.length >= HOTSPOT_LIMIT) break;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    if (r.bottom < 0 || r.top > h || r.right < 0 || r.left > w) continue;
    const x = Math.min(Math.max(r.left + r.width / 2, 24), w - 24);
    const y = Math.min(Math.max(r.top + r.height / 2, 24), h - 24);
    if ([...pts, ...picked].some((p) => Math.hypot(p.x - x, p.y - y) < minDist)) continue;
    picked.push({ x, y });
  }
  const c = pts[0];
  const rest = [...pts.slice(1), ...picked].sort(
    (a, b) => Math.atan2(a.y - c.y, a.x - c.x) - Math.atan2(b.y - c.y, b.x - c.x),
  );
  return [c, ...rest];
}

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

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<SVGCircleElement | null>(null);
  const trackerRef = useRef<GazeTracker | null>(null);
  const dwellRef = useRef(new DwellController());
  // Two smoothing stages: the raw features wobble most (and the mapping magnifies it), so they
  // get the steadier filter; the pixel filter takes the residual edge off, and its deadzone
  // swallows small tremor entirely. Max alphas are the fast end: held 2% below the previous
  // tuning (0.75/0.55) after "too rigid" -> revert -> "a little more rigid".
  const featureSmootherRef = useRef(new FeatureSmoother(0.3, 0.735, 0.06));
  const smootherRef = useRef(new SmoothedPoint(0.2, 0.539, 0.02, 2));
  const mappingRef = useRef<GazeMapping | null>(null);
  const samplesRef = useRef<CalibrationSample[]>([]);
  const calibStartRef = useRef(0);
  const calibDotRef = useRef<HTMLDivElement | null>(null);
  const calibBarRef = useRef<HTMLDivElement | null>(null);
  const calibTimerRef = useRef<HTMLSpanElement | null>(null);
  const elementKeysRef = useRef(new WeakMap<Element, number>());
  const nextKeyRef = useRef(1);
  const noFaceRef = useRef(false);
  const unstableRef = useRef(false);

  const active = phase === "calibrating" || phase === "on";

  const enable = useCallback(async () => {
    setPhase("starting");
    setStatus("Gaze is starting - allow the camera and keep this tab visible.");
    setNoFace(false);
    samplesRef.current = [];
    calibStartRef.current = performance.now();
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

  // The render loop: face landmarks -> gaze point -> cursor -> dwell -> activation.
  // While calibrating, the same loop also drives the moving dot the user follows and records
  // (smoothed features, dot position) samples for the fit.
  useEffect(() => {
    if (phase !== "calibrating" && phase !== "on") return;
    const dwell = dwellRef.current;
    const featureSmoother = featureSmootherRef.current;
    const smoother = smootherRef.current;
    smoother.reset();
    featureSmoother.reset();
    const waypoints = phase === "calibrating" ? buildCalibrationWaypoints() : null;
    const segCount = waypoints ? waypoints.length - 1 : 0;
    const segMs = waypoints ? CALIBRATION_MS / segCount : 0;
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
      if (phase === "calibrating" && waypoints) {
        // Drive the moving dot along the eased waypoint path and record samples while it is
        // slow enough for the eye to have settled on it (fast-transit samples carry lag).
        const t = now - calibStartRef.current - CALIBRATION_LEAD_MS;
        if (t >= CALIBRATION_MS) {
          mappingRef.current = samplesRef.current.length >= CALIBRATION_FIT_MIN ? fitGazeMapping(samplesRef.current) : null;
          featureSmoother.reset();
          smoother.reset();
          setPhase("on");
          return;
        }
        const i = Math.min(Math.floor(Math.max(t, 0) / segMs), segCount - 1);
        const u = t < 0 ? 0 : Math.min((t - i * segMs) / segMs, 1);
        const eased = (1 - Math.cos(Math.PI * u)) / 2;
        const a = waypoints[i];
        const b = waypoints[i + 1];
        const dx = a.x + (b.x - a.x) * eased;
        const dy = a.y + (b.y - a.y) * eased;
        const dot = calibDotRef.current;
        if (dot) dot.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
        const bar = calibBarRef.current;
        if (bar) bar.style.width = `${Math.min(Math.max(t / CALIBRATION_MS, 0), 1) * 100}%`;
        const timer = calibTimerRef.current;
        if (timer) {
          const secs = Math.max(Math.ceil((CALIBRATION_MS - Math.max(t, 0)) / 1000), 0);
          if (timer.textContent !== `${secs}s`) timer.textContent = `${secs}s`; // avoid a DOM write every frame
        }
        const sm = features ? featureSmoother.next(features, dt) : null;
        if (sm && samplesRef.current.length < CALIBRATION_MAX_SAMPLES && t >= 0 && Math.sin(Math.PI * u) <= CALIBRATION_GATE) {
          samplesRef.current.push({ features: sm, screen: { x: dx / window.innerWidth, y: dy / window.innerHeight } });
        }
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
          <p className="mx-auto mt-[max(4rem,10svh)] max-w-md px-6 text-center text-lg font-semibold leading-snug">
            Follow the dot with your eyes for 30 seconds. Keep your head still and let your eyes do the moving.
          </p>
          <div aria-hidden="true" className="mx-auto mt-6 h-1.5 w-56 overflow-hidden rounded-full bg-white/15">
            <div ref={calibBarRef} className="h-full w-0 rounded-full bg-blue" />
          </div>
          <p aria-hidden="true" className="mt-2 text-center text-base font-semibold text-white/80">
            <span ref={calibTimerRef}>30s</span> left
          </p>
          <div
            ref={calibDotRef}
            aria-hidden="true"
            className="pointer-events-none fixed left-0 top-0 will-change-transform"
            style={{ transform: "translate3d(-100px, -100px, 0)" }}
          >
            <span className="block size-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue shadow-lift ring-4 ring-white/80" />
          </div>
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
