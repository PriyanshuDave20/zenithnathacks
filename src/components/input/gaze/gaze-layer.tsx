"use client";

// Webcam gaze control for the whole site (ICU stretch feature), mounted once in the root layout.
// Opt-in only: nothing happens until the small edge toggle is pressed. While enabled, an on-page
// gaze cursor follows where the user is looking; holding it still on a control for 2 s activates
// it (dwell-to-select). Camera frames are processed on the device only (src/lib/input/gaze) and
// are never uploaded, stored, or logged. Nothing here modifies the page: the cursor, calibration
// and status layers are pointer-events-none, so the site behaves exactly as before when gaze is off.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cancelGazeRequest, getGazeAvailable, getGazeEdgeWide, getGazeRequested, setGazeError, setGazePhase, subscribeGaze } from "./gaze-availability";
import { DwellController } from "@/lib/input/gaze/dwell";
import {
  applyGazeMapping,
  BlinkGuard,
  BlinkSafeBuffer,
  calibrationFixation,
  edgeSafePx,
  FeatureSmoother,
  FixationFilter,
  fitGazeCalibration,
  gazeFeatures,
  LightMonitor,
  medianFeatures,
  OneEuroFilter,
  pickGazeTarget,
  PostureMonitor,
  postureOf,
  recenterMapping,
  type Posture,
  type CalibrationSample,
  type GazeBox,
  type GazeFeatures,
  type GazeFit,
  type GazeFitFailure,
  type LightVerdict,
  type PostureVerdict,
  type GazeMapping,
} from "@/lib/input/gaze/gaze-math";
import { GazeTracker } from "@/lib/input/gaze/tracker";

type Phase = "off" | "starting" | "calibrating" | "on" | "error";

const RING_C = 2 * Math.PI * 22;
/** Nine stationary calibration targets share this duration. */
const CALIBRATION_MS = 30000;
/** The dot rests at the centre first, so the eye can settle before the sweep starts. */
const CALIBRATION_LEAD_MS = 800;
/** Below this many usable samples calibration must be retried. */
const CALIBRATION_FIT_MIN = 60;
const CALIBRATION_MAX_SAMPLES = 800;
const EDGE_ZONE = 88; // px band at the top/bottom edge that scrolls the page
const NO_FACE_MS = 2500;
const BLINK_GRACE_MS = 600; // a dropped prediction shorter than this holds the last gaze point (a blink plus its settle)

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
 * Nine fixed targets, centre first, then the corners and edge midpoints. No moving pursuit:
 * each target stays put for ~3.3 seconds, with the first second ignored for eye travel.
 */
function buildCalibrationWaypoints(): { x: number; y: number }[] {
  const w = window.innerWidth;
  const h = window.innerHeight;
  // The dot must never go under a bright screen edge (a system light such as Mac Edge Light draws over
  // the page and would hide it): keep it, with room for its own ring, inside the edge-safe margin.
  const safe = edgeSafePx(w, h, getGazeEdgeWide()) + 28;
  const insetX = Math.max(0.12, safe / w);
  const insetY = Math.max(0.12, safe / h);
  const pts = [
    { x: 0.5 * w, y: 0.5 * h },
    { x: insetX * w, y: insetY * h },
    { x: 0.5 * w, y: insetY * h },
    { x: (1 - insetX) * w, y: insetY * h },
    { x: (1 - insetX) * w, y: 0.5 * h },
    { x: (1 - insetX) * w, y: (1 - insetY) * h },
    { x: 0.5 * w, y: (1 - insetY) * h },
    { x: insetX * w, y: (1 - insetY) * h },
    { x: insetX * w, y: 0.5 * h },
  ];
  return pts;
}

function selectableTarget(el: Element | null): Element | null {
  if (!el || el.closest("[data-gaze-ignore]")) return null;
  const target = el.closest(INTERACTIVE);
  return target?.matches(":disabled, [aria-disabled=\"true\"]") || target?.closest("[inert]") ? null : target;
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
  const click = new MouseEvent("click", init);
  Object.defineProperty(click, "synapseInputChannel", { value: "gaze" });
  el.dispatchEvent(click);
}

const RECENTER_MS = 2400; // look at the centre dot this long...
const RECENTER_SETTLE_MS = 800; // ...ignoring the first part while the eyes get there
const RECENTER_MIN_READS = 12;

const clampNum = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Every control the gaze could mean right now, with its box. Controls covered by something else (a dialog) are left out. */
function gazeCandidates(): { el: Element; box: GazeBox }[] {
  const out: { el: Element; box: GazeBox }[] = [];
  for (const el of Array.from(document.querySelectorAll(INTERACTIVE))) {
    if (selectableTarget(el) !== el) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8 || r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) continue;
    const top = document.elementFromPoint(clampNum(r.left + r.width / 2, 0, window.innerWidth - 1), clampNum(r.top + r.height / 2, 0, window.innerHeight - 1));
    if (!top || !(top === el || el.contains(top))) continue;
    out.push({ el, box: { id: out.length, left: r.left, top: r.top, right: r.right, bottom: r.bottom } });
  }
  return out;
}

const POSTURE_HINT: Record<Exclude<PostureVerdict, "ok">, string> = {
  moved: "Selection paused: your head or device moved. Return to your calibrated position, or tap Recenter.",
  distance: "Selection paused: your distance from the screen changed. Return to your calibrated position, or tap Recenter.",
  turned: "Selection paused: your head has turned. Face the screen as before, or tap Recenter.",
};
const LIGHT_HINT: Record<Exclude<LightVerdict, "ok">, string> = {
  changed: "The lighting has changed since you calibrated. Tap Recalibrate for the best accuracy.",
  dark: "It is quite dark in front of the camera. Add light facing you.",
};

const percent = (fraction: number) => Math.round(fraction * 100);
const fairMessage = (error: number) =>
  `Eye control is on, but accuracy is approximate (typical error about ${percent(error)}% of the screen). Brighter even light and a steady head help; tap Recalibrate to try again, or Recenter if the pointer sits to one side.`;
const goodMessage = (error: number) =>
  `Calibrated: typical error about ${percent(error)}% of the screen. If the pointer drifts to one side, tap Recenter and look at the dot.`;

/** What to tell the person when calibration is refused: each reason has a different fix. */
function calibrationFailureMessage(reason: GazeFitFailure, samples: number, error?: number, dark = false, axisError?: { x: number; y: number }) {
  const darkNote = dark ? " It also looks quite dark in front of the camera: add light facing you." : "";
  switch (reason) {
    case "few-samples":
      return `The camera only caught your eyes for part of calibration (${samples} usable moments). Sit centred facing the camera, in even light, with your whole face in view.${darkNote}`;
    case "coverage":
    case "no-spread":
      return "The camera could not measure enough eye movement. Look at each dot until it moves, keeping your head still, and try again.";
    case "too-noisy":
      return `Calibration could not match your gaze to the dots${axisError ? ` (horizontal error ${percent(axisError.x)}%, vertical ${percent(axisError.y)}%)` : error ? ` (about ${percent(error)}% off)` : ""}. Look at each stationary dot until it moves, keeping your head still, then try again.${darkNote}`;
    default:
      return "Calibration needs another try. Keep your head steady and look at each dot until it moves.";
  }
}

function cameraDenied(e: unknown) {
  return e instanceof DOMException && ["NotAllowedError", "NotFoundError", "NotReadableError", "SecurityError"].includes(e.name);
}

export function GazeLayer() {
  // Only screens that declare they want gaze (the patient's Eye mode board) get the control at all.
  const available = useSyncExternalStore(subscribeGaze, getGazeAvailable, () => false);
  // ...and the camera waits for the clinician's Start, so both people can be looking when it begins.
  const requested = useSyncExternalStore(subscribeGaze, getGazeRequested, () => false);
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
  // One-Euro: steady at rest, no lag on a jump. Tuned to this tracker's noise (the usual defaults jitter more here).
  const smootherRef = useRef(new OneEuroFilter(0.3, 0.002, 0.5));
  // Drops the frames of a blink, so closing eyelids cannot drag the pointer.
  const blinkGuardRef = useRef(new BlinkGuard());
  const blinkBufferRef = useRef(new BlinkSafeBuffer());
  // A steady look is averaged over a longer window, so tracking jitter does not decide which button is chosen.
  const fixationRef = useRef(new FixationFilter());
  const stickyTargetRef = useRef<Element | null>(null);
  const candidatesRef = useRef<{ at: number; items: { el: Element; box: GazeBox }[] }>({ at: 0, items: [] });
  // One-point drift correction in progress (null when not recentering).
  const recenterRef = useRef<{ start: number; reads: GazeFeatures[]; posture: Posture[] } | null>(null);
  const [recentering, setRecentering] = useState(false);
  // The head moving away from where it was at calibration is the biggest cause of drift; so is the light changing.
  const postureRef = useRef(new PostureMonitor());
  const lightRef = useRef(new LightMonitor());
  const lightVerdictRef = useRef<LightVerdict>("ok");
  const lastLumaRef = useRef(0);
  const hintRef = useRef<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
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
  const generationRef = useRef(0);

  const calibrationDialog = useRef<HTMLDialogElement>(null);
  const active = phase === "calibrating" || phase === "on";

  const enable = useCallback(async () => {
    const generation = ++generationRef.current;
    setPhase("starting");
    setStatus("Gaze is starting - allow the camera and keep this tab visible.");
    setNoFace(false);
    noFaceRef.current = false;
    unstableRef.current = false;
    setUnstable(false);
    mappingRef.current = null;
    dwellRef.current = new DwellController();
    blinkGuardRef.current.reset();
    blinkBufferRef.current.reset();
    fixationRef.current.reset();
    stickyTargetRef.current = null;
    recenterRef.current = null;
    setRecentering(false);
    postureRef.current.reset();
    lightRef.current.reset();
    lightVerdictRef.current = "ok";
    hintRef.current = null;
    setHint(null);
    samplesRef.current = [];
    calibStartRef.current = performance.now();
    if (!trackerRef.current) trackerRef.current = new GazeTracker();
    try {
      await trackerRef.current.start(videoRef.current!);
      if (generation !== generationRef.current) { trackerRef.current.stop(); return; }
      calibStartRef.current = performance.now();
      setStatus(null);
      setPhase("calibrating");
    } catch (e) {
      if (generation !== generationRef.current) return;
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
    generationRef.current++;
    trackerRef.current?.stop();
    dwellRef.current = new DwellController();
    blinkGuardRef.current.reset();
    blinkBufferRef.current.reset();
    fixationRef.current.reset();
    stickyTargetRef.current = null;
    recenterRef.current = null;
    setRecentering(false);
    postureRef.current.reset();
    lightRef.current.reset();
    lightVerdictRef.current = "ok";
    hintRef.current = null;
    setHint(null);
    smootherRef.current.reset();
    mappingRef.current = null;
    setStatus(null);
    setNoFace(false);
    setPhase("off");
  }, []);


  useEffect(() => {
    window.addEventListener("synapse:gaze-stop", disable);
    return () => window.removeEventListener("synapse:gaze-stop", disable);
  }, [disable]);

  // Camera and calibration start when the clinician taps Start on the board; when the board goes away
  // (handoff, review, cleared, other page) or calibration is cancelled, the camera goes off.
  useEffect(() => {
    // Next tick, cancellable: a quick on/off (or a dev double-run) never starts and stops the camera.
    const timer = setTimeout(() => {
      if (available && requested) void enable();
      else disable();
    }, 0);
    return () => clearTimeout(timer);
  }, [available, requested, enable, disable]);

  // Tell the screen where we have got to; a failure goes back to the ready step with its message.
  useEffect(() => {
    setGazePhase(phase);
    if (phase === "error") {
      setGazeError(status);
      cancelGazeRequest();
    }
  }, [phase, status]);
  useEffect(() => () => setGazePhase("off"), []);

  // Cancelling calibration returns to the ready step instead of leaving a lone toggle.
  const cancelCalibration = useCallback(() => {
    disable();
    cancelGazeRequest();
  }, [disable]);

  useEffect(() => {
    if (phase !== "calibrating") return;
    const dialog = calibrationDialog.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [phase]);

  const recalibrate = useCallback(() => {
    samplesRef.current = [];
    calibStartRef.current = performance.now();
    mappingRef.current = null;
    dwellRef.current = new DwellController();
    blinkGuardRef.current.reset();
    blinkBufferRef.current.reset();
    fixationRef.current.reset();
    stickyTargetRef.current = null;
    recenterRef.current = null;
    setRecentering(false);
    postureRef.current.reset();
    lightRef.current.reset();
    lightVerdictRef.current = "ok";
    hintRef.current = null;
    setHint(null);
    setStatus(null);
    setPhase("calibrating");
  }, []);

  // One-point drift correction: after the head shifts (or the device is passed round) the whole pointer
  // sits to one side. Looking at one dot for a couple of seconds removes that offset without a full calibration.
  const recenter = useCallback(() => {
    if (!mappingRef.current) return;
    recenterRef.current = { start: performance.now(), reads: [], posture: [] };
    dwellRef.current = new DwellController();
    setStatus(null);
    setRecentering(true);
  }, []);

  useEffect(() => {
    if (phase !== "on") return;
    window.addEventListener("resize", recalibrate);
    return () => window.removeEventListener("resize", recalibrate);
  }, [phase, recalibrate]);

  // The camera must go out when the layer unmounts, whatever the phase.
  useEffect(() => () => { generationRef.current++; trackerRef.current?.stop(); }, []);

  // The render loop: face landmarks -> gaze point -> cursor -> dwell -> activation.
  // During calibration the loop places stationary targets and records settled, blink-filtered readings.
  useEffect(() => {
    if (phase !== "calibrating" && phase !== "on") return;
    const dwell = dwellRef.current;
    const featureSmoother = featureSmootherRef.current;
    const smoother = smootherRef.current;
    smoother.reset();
    featureSmoother.reset();
    const waypoints = phase === "calibrating" ? buildCalibrationWaypoints() : null;
    let raf = 0;
    let last = performance.now();
    let lastFeatureAt = last;
    let lastCalibrationSampleAt = -Infinity;
    let lastSmoothed: GazeFeatures | null = null;
    blinkBufferRef.current.reset();

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const elapsed = now - last;
      const dt = Math.min(elapsed, 250);
      last = now;

      if (phase === "calibrating" && (document.hidden || elapsed > 250)) calibStartRef.current += elapsed;
      if (document.hidden) {
        dwell.update(now, null);
        lastSmoothed = null;
        return;
      }
      const featureDt = now - lastFeatureAt;
      const landmarks = trackerRef.current?.detect(now);
      if (landmarks === undefined) {
        if (now - lastFeatureAt > BLINK_GRACE_MS) {
          dwell.update(now, null);
          ringRef.current?.style.setProperty("stroke-dashoffset", String(RING_C));
        }
        return;
      }
      const observed = blinkGuardRef.current.next(gazeFeatures(landmarks), now);
      const reading = blinkBufferRef.current.next(observed, now);
      const features = reading?.features ?? null;
      // A blink or tracking loss invalidates filter history too: otherwise the old fixation and
      // pre-blink offset keep pulling the recovered pointer back for up to 700 ms.
      if (!observed) {
        featureSmoother.reset();
        smoother.reset();
        fixationRef.current.reset();
        stickyTargetRef.current = null;
      }
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

      // Posture and light. During calibration collect the reference; afterwards notice when the head has
      // moved or the room has changed, which is what makes the pointer drift to one side.
      const posture = observed && landmarks ? postureOf(landmarks) : null;
      let postureOutside = false;
      if (features && landmarks) {
        const sampleLight = () => {
          if (now - lastLumaRef.current <= 400) return null;
          lastLumaRef.current = now;
          return trackerRef.current?.faceLuma(landmarks) ?? null;
        };
        if (phase === "calibrating") {
          if (posture) postureRef.current.addReference(posture);
          const level = sampleLight();
          if (level !== null) lightRef.current.addReference(level);
        } else if (posture && !recenterRef.current) {
          const immediate = postureRef.current.outside(posture);
          postureOutside = immediate !== "ok";
          const pv = postureRef.current.next(posture, now);
          // Explain immediately why selection pauses, rather than waiting 1.5 seconds.
          const warning = postureOutside ? immediate : pv;
          const level = sampleLight();
          if (level !== null) lightVerdictRef.current = lightRef.current.next(level, now);
          const lv = lightVerdictRef.current;
          const next = warning !== "ok" ? POSTURE_HINT[warning] : lv !== "ok" ? LIGHT_HINT[lv] : null;
          if (next !== hintRef.current) {
            hintRef.current = next;
            setHint(next);
          }
        }
      }

      const cursor = cursorRef.current;
      if (phase === "calibrating" && waypoints) {
        // Hold each dot still and record only after the eyes have had time to settle.
        const t = now - calibStartRef.current - CALIBRATION_LEAD_MS;
        if (t >= CALIBRATION_MS) {
          const fit: GazeFit =
            samplesRef.current.length >= CALIBRATION_FIT_MIN
              ? fitGazeCalibration(samplesRef.current)
              : { mapping: null, reason: "few-samples" };
          mappingRef.current = fit.mapping;
          if (!fit.mapping) {
            trackerRef.current?.stop();
            setStatus(calibrationFailureMessage(fit.reason, samplesRef.current.length, fit.medianError, lightRef.current.isDark, fit.axisError));
            setPhase("error");
            return;
          }
          featureSmoother.reset();
          smoother.reset();
          // Remember how they are sitting and how bright their face is, to notice when either changes.
          postureRef.current.lockReference();
          lightRef.current.lockReference();
          lightVerdictRef.current = "ok";
          // Usable but approximate: turn it on and say so, rather than sending the person round again.
          const note = fit.quality === "fair" ? fairMessage(fit.medianError) : goodMessage(fit.medianError);
          setStatus(note);
          setTimeout(() => setStatus((current) => (current === note ? null : current)), fit.quality === "fair" ? 15000 : 10000);
          setPhase("on");
          return;
        }
        const fixation = calibrationFixation(t, waypoints.length, CALIBRATION_MS);
        const { x: dx, y: dy } = waypoints[fixation.index];
        const dot = calibDotRef.current;
        if (dot) dot.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
        const bar = calibBarRef.current;
        if (bar) bar.style.width = `${Math.min(Math.max(t / CALIBRATION_MS, 0), 1) * 100}%`;
        const timer = calibTimerRef.current;
        if (timer) {
          const secs = Math.max(Math.ceil((CALIBRATION_MS - Math.max(t, 0)) / 1000), 0);
          if (timer.textContent !== `${secs}s`) timer.textContent = `${secs}s`; // avoid a DOM write every frame
        }
        const sampleT = (reading?.at ?? now) - calibStartRef.current - CALIBRATION_LEAD_MS;
        const sampleFixation = calibrationFixation(sampleT, waypoints.length, CALIBRATION_MS);
        if (features && sampleFixation.collect && reading && reading.at - lastCalibrationSampleAt >= 40 && samplesRef.current.length < CALIBRATION_MAX_SAMPLES) {
          lastCalibrationSampleAt = reading.at;
          const target = waypoints[sampleFixation.index];
          // Raw blink-filtered readings at a stationary target; no pursuit/filter lag to fit.
          samplesRef.current.push({ features, screen: { x: target.x / window.innerWidth, y: target.y / window.innerHeight } });
        }
        return;
      }
      if (!cursor) return;

      // Blink grace: a dropped prediction for a moment (a blink) holds the last known gaze
      // instead of snapping the cursor; dwell still resets, so a blink cannot confirm a choice.
      const held = !features && lastSmoothed && now - lastFeatureAt <= BLINK_GRACE_MS;
      if (!features) {
        if (!held) lastSmoothed = null;
        dwell.update(now, null);
        cursor.style.opacity = held ? "1" : "0.25";
        ringRef.current?.style.setProperty("stroke-dashoffset", String(RING_C));
        return; // held points must not be added repeatedly to the fixation history
      }

      const smoothed = featureSmoother.next(features, featureDt);
      lastSmoothed = smoothed;
      const point = applyGazeMapping(mappingRef.current, smoothed);
      const x = point.x * window.innerWidth;
      const y = point.y * window.innerHeight;
      const p0 = smoother.next({ x, y }, featureDt);
      const jump = clampNum(Math.min(window.innerWidth, window.innerHeight) * 0.12, 60, 140);
      const p = fixationRef.current.next(p0, now, jump);
      cursor.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
      cursor.style.opacity = "1";

      // Drift correction in progress: collect a steady reading of the eyes on the centre dot; no selecting meanwhile.
      const rc = recenterRef.current;
      if (rc) {
        const spent = now - rc.start;
        if (features && spent > RECENTER_SETTLE_MS) {
          rc.reads.push(smoothed);
          if (posture) rc.posture.push(posture);
        }
        if (spent > RECENTER_MS) {
          recenterRef.current = null;
          const middle = medianFeatures(rc.reads);
          if (middle && rc.reads.length >= RECENTER_MIN_READS && mappingRef.current) {
            mappingRef.current = recenterMapping(mappingRef.current, middle);
            featureSmoother.reset();
            smoother.reset();
            fixationRef.current.reset();
            // The offset is now corrected for how they are sitting NOW: that is the new reference.
            postureRef.current.reset();
            for (const q of rc.posture) postureRef.current.addReference(q);
            postureRef.current.lockReference();
            hintRef.current = null;
            setHint(null);
            setStatus("Recentered.");
            setTimeout(() => setStatus((current) => (current === "Recentered." ? null : current)), 4000);
          } else {
            setStatus("The camera could not see your eyes during the recenter. Face the camera and try again.");
          }
          setRecentering(false);
        }
        dwell.update(now, null);
        ringRef.current?.style.setProperty("stroke-dashoffset", String(RING_C));
        return;
      }

      // A still-head calibration cannot predict the correction for an unseen head/device pose.
      // Keep Recenter available by touch, but never dwell-select with an invalid mapping.
      if (postureOutside) {
        dwell.update(now, null);
        ringRef.current?.style.setProperty("stroke-dashoffset", String(RING_C));
        stickyTargetRef.current = null;
        fixationRef.current.reset();
        cursor.style.opacity = "0.25";
        return;
      }

      // Which control is meant: the one under the pointer, else the nearest within reach, and it sticks
      // unless another is clearly closer. Webcam tracking is only good to a fraction of a screen.
      if (now - candidatesRef.current.at > 200) candidatesRef.current = { at: now, items: gazeCandidates() };
      const items = candidatesRef.current.items;
      const previous = items.find((c) => c.el === stickyTargetRef.current)?.box.id ?? null;
      const reach = clampNum(Math.min(window.innerWidth, window.innerHeight) * 0.14, 56, 130);
      const chosen = pickGazeTarget(p, items.map((c) => c.box), { radius: reach, previous });
      const target = chosen == null ? null : (items.find((c) => c.box.id === chosen)?.el ?? null);
      stickyTargetRef.current = target;
      // Edge scrolling asks whether the pointer is actually ON a control, not merely near one.
      const onControl = selectableTarget(document.elementFromPoint(p.x, p.y));
      let key: string | null = null;
      if (target) {
        let k = elementKeysRef.current.get(target);
        if (!k) {
          k = nextKeyRef.current++;
          elementKeysRef.current.set(target, k);
        }
        key = String(k);
      }
      // Never let a held/stale prediction finish a dwell during a blink or dropped camera frame.
      const state = dwell.update(now, features ? key : null);

      if (ringRef.current) ringRef.current.style.strokeDashoffset = String(RING_C * (1 - state.progress));

      // Gaze scrolling: rest the gaze in the top or bottom band to move the page, but only
      // while it is not resting on a control (a dwell there means "press", not "scroll").
      if (features && !onControl) {
        const h = window.innerHeight;
        let v = 0;
        if (p.y < EDGE_ZONE) v = -1100 * (1 - p.y / EDGE_ZONE);
        else if (p.y > h - EDGE_ZONE) v = 1100 * (1 - (h - p.y) / EDGE_ZONE);
        if (v) {
          window.scrollBy(0, (v * dt) / 1000);
          candidatesRef.current.at = 0; // the page moved: re-measure the controls
        }
      }

      if (state.progress >= 1 && target && key) {
        const box = target.getBoundingClientRect();
        activate(target, box.left + box.width / 2, box.top + box.height / 2);
        dwell.fired(now);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const toggleLabel = active ? "Turn off gaze control" : "Turn on gaze control (webcam)";

  if (!available) return null;

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
          <svg width="36" height="36" viewBox="0 0 72 72" className="-ml-[18px] -mt-[18px] block drop-shadow-[0_1px_4px_rgb(16_30_52/0.35)]">
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
        <dialog ref={calibrationDialog} aria-modal="true" aria-label="Gaze calibration" onCancel={(event) => { event.preventDefault(); cancelCalibration(); }} className="fixed inset-0 z-[70] m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-navy/90 text-white">
          <p className="mx-auto mt-[max(4rem,10svh)] max-w-md px-6 text-center text-lg font-semibold leading-snug">
            Look at the dot and hold your gaze until it moves to the next position. Keep your head still. This takes 30 seconds.
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
            onClick={cancelCalibration}
            style={{ bottom: "max(40px, var(--eye-edge, 40px))" }}
            className="press absolute left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-6 py-3 text-base font-semibold text-white hover:bg-white/20"
          >
            Cancel calibration
          </button>
        </dialog>
      ) : null}

      {status || (phase === "on" && (hint || noFace || unstable)) ? (
        <p
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed z-[70] rounded-field bg-surface p-3 text-sm font-medium leading-snug text-ink shadow-soft ring-1 ring-line"
          // A toast under the header, centred: the one place on the board with no control to lie on top of.
          style={{ top: "calc(var(--eye-edge-v, 8px) + 76px)", insetInlineStart: "50%", transform: "translateX(-50%)", width: "max-content", maxWidth: "min(32rem, calc(100vw - 2 * max(24px, var(--eye-edge, 24px))))", textAlign: "center" }}
        >
          {status ?? (phase === "on" ? hint : null) ?? (unstable ? "Tracking is struggling - try brighter, even lighting." : "No face seen - sit centred in front of the camera.")}
        </p>
      ) : null}

      {phase === "on" ? (
        <button type="button" onClick={recalibrate}
          style={{ insetInlineEnd: "var(--eye-edge, 8px)" }}
          className="press fixed end-2 top-[calc(50%+2rem)] z-[70] min-h-11 rounded-full bg-surface px-3 text-xs font-semibold text-ink shadow-soft ring-1 ring-line">
          Recalibrate
        </button>
      ) : null}

      {phase === "on" && !recentering ? (
        <button
          type="button"
          onClick={recenter}
          className="press"
          style={{ position: "fixed", insetInlineEnd: "var(--eye-edge, 8px)", top: "calc(50% + 4.9rem)", zIndex: 70, minHeight: 44, padding: "0 12px", borderRadius: 9999, background: "#fff", color: "#101e34", fontSize: 12, fontWeight: 600, boxShadow: "0 1px 2px rgb(16 30 52 / 0.12), inset 0 0 0 1px #d5e0eb" }}
        >
          Recenter
        </button>
      ) : null}

      {recentering ? (
        <div
          role="status"
          aria-live="polite"
          style={{ position: "fixed", inset: 0, zIndex: 69, pointerEvents: "none", background: "rgba(16, 30, 52, 0.82)", color: "#fff", display: "grid", placeItems: "center" }}
        >
          <p style={{ position: "absolute", top: "max(5rem, 12svh)", left: 0, right: 0, textAlign: "center", fontSize: 22, fontWeight: 700, padding: "0 24px" }}>
            Look at the dot in the middle and keep your head steady
          </p>
          <span style={{ width: 30, height: 30, borderRadius: 9999, background: "#77a0c4", boxShadow: "0 0 0 6px rgba(255,255,255,0.85)" }} />
        </div>
      ) : null}

      {requested ? (
        <button
          type="button"
          onClick={active || phase === "starting" ? cancelCalibration : enable}
          aria-pressed={active}
          disabled={phase === "starting"}
          aria-label={toggleLabel}
          title="Gaze control (webcam)"
          style={{ insetInlineEnd: "var(--eye-edge, 8px)" }}
          className={`press fixed end-2 top-1/2 z-[70] grid size-11 -translate-y-1/2 place-items-center rounded-full shadow-soft ring-1 motion-reduce:transition-none ${
            active ? "bg-blue-deep text-white ring-blue-deep" : "bg-surface/95 text-ink-soft ring-line hover:text-ink"
          }`}
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
            <circle cx="12" cy="12" r="2.75" />
          </svg>
        </button>
      ) : null}
    </>
  );
}
