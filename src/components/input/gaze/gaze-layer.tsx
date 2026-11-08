"use client";

// Webcam gaze control (WebGazer.js engine), mounted once in the root layout but gated: it stays
// invisible until a screen declares it wants gaze (the patient's Eye mode board) and the clinician
// has said go. WebGazer runs entirely in the browser: the webcam stream and the face-mesh
// regression stay on the device, its solution files are served from public/mediapipe/face_mesh,
// and nothing is uploaded, stored, or logged. While on, an on-page gaze cursor follows the
// predicted gaze point; holding it still on a control for 2 s activates it (dwell-to-select), and
// the pointer is magnetic near controls. Nothing here modifies the page: cursor, calibration and
// status layers are pointer-events-none, so the site behaves exactly as before when gaze is off.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cancelGazeRequest, getGazeAvailable, getGazeEdgeWide, getGazeRequested, setGazeError, setGazePhase, subscribeGaze } from "./gaze-availability";
import { DwellController } from "@/lib/input/gaze/dwell";
import { calibrationFixation, edgeSafePx, FixationFilter, median, OneEuroFilter, pickGazeTarget, type GazeBox } from "@/lib/input/gaze/gaze-math";
import { GazeTracker } from "@/lib/input/gaze/tracker";

type Phase = "off" | "starting" | "calibrating" | "on" | "error";

const RING_C = 2 * Math.PI * 22;
/** The stationary calibration targets share this duration (grid + on-screen controls). */
const CALIBRATION_MS = 30000;
/** The dot rests at the centre first, so the eye can settle before the sweep starts. */
const CALIBRATION_LEAD_MS = 800;
/** Below this many recorded labels the sweep must be retried: WebGazer's regression needs data. */
const CALIBRATION_FIT_MIN = 60;
/** Calibration labels are recorded at most this often (each one trains the regression). */
const CALIBRATION_RECORD_GAP_MS = 40;
/** After calibration, this long is spent counting live predictions; below PROBE_MIN the view is not tracking. */
const PROBE_MS = 3000;
const PROBE_MIN = 5;
/** A prediction older than this means the tracker has lost the face (WebGazer emits continuously while it sees one). */
const SIGNAL_STALE_MS = 600;
const EDGE_ZONE = 88; // px band at the top/bottom edge that scrolls the page
const NO_FACE_MS = 2500;

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
 * Fixed calibration targets: centre first, then corners and edge midpoints, then the centres of
 * up to eight on-screen controls ("hotspots" - the buttons the patient will actually select).
 * Calibrating directly on the selectable options ties the regression to the places that matter,
 * and the magnet can then trust its pull. Each target stays put, with the first second ignored
 * for eye travel.
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
  const cap = 8;
  const minDist = 0.09 * Math.hypot(w, h);
  const seen = [...pts];
  for (const c of gazeCandidates()) {
    if (seen.length >= pts.length + cap) break;
    const x = clampNum(c.box.left + (c.box.right - c.box.left) / 2, safe, w - safe);
    const y = clampNum(c.box.top + (c.box.bottom - c.box.top) / 2, safe, h - safe);
    if (seen.some((p) => Math.hypot(p.x - x, p.y - y) < minDist)) continue;
    seen.push({ x, y });
  }
  return seen;
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

const calibratedMessage =
  "Eye control is on. Stare at a choice for two seconds; if the pointer sits to one side, tap Recenter and look at the dot.";

function calibrationFailureMessage(samples: number) {
  return `The camera only caught your eyes for part of calibration (${samples} of ${CALIBRATION_FIT_MIN} needed readings). Sit centred facing the camera, in even light, with your whole face in view, and try again.`;
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

  const cursorRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<SVGCircleElement | null>(null);
  const trackerRef = useRef<GazeTracker | null>(null);
  const dwellRef = useRef(new DwellController());
  // One-Euro on WebGazer's predicted point (it already applies its own Kalman filter; this takes
  // the residual edge off while staying responsive).
  const smootherRef = useRef(new OneEuroFilter(0.8, 0.012, 1.0));
  // A steady look is averaged over a short window (responsiveness first; the magnet handles the rest),
  // so tracking jitter does not decide which button is chosen.
  const fixationRef = useRef(new FixationFilter(500, 4));
  const stickyTargetRef = useRef<Element | null>(null);
  const candidatesRef = useRef<{ at: number; items: { el: Element; box: GazeBox }[] }>({ at: 0, items: [] });
  // WebGazer's newest prediction lands here from its own loop; the render loop reads it per frame.
  const predictionRef = useRef<{ x: number; y: number; at: number } | null>(null);
  // One-point drift correction (Recenter): a constant offset applied to every prediction.
  const recenterOffsetRef = useRef({ x: 0, y: 0 });
  const recenterRunRef = useRef<{ start: number; reads: { x: number; y: number }[] } | null>(null);
  const [recentering, setRecentering] = useState(false);
  // After calibration, a short probe counts live predictions; if the model is not responding
  // (e.g. the zoomed view does not track on this camera) the layer retries with the safe view.
  const probeRef = useRef<{ until: number; seen: number } | null>(null);
  const calibStartRef = useRef(0);
  const calibDotRef = useRef<HTMLDivElement | null>(null);
  const calibBarRef = useRef<HTMLDivElement | null>(null);
  const calibTimerRef = useRef<HTMLSpanElement | null>(null);
  const calibDotTimerRef = useRef<HTMLSpanElement | null>(null);
  const elementKeysRef = useRef(new WeakMap<Element, number>());
  const nextKeyRef = useRef(1);
  const noFaceRef = useRef(false);
  const generationRef = useRef(0);

  const calibrationDialog = useRef<HTMLDialogElement>(null);
  const active = phase === "calibrating" || phase === "on";

  const enable = useCallback(async () => {
    const generation = ++generationRef.current;
    setPhase("starting");
    setStatus("Gaze is starting - allow the camera and keep this tab visible.");
    setNoFace(false);
    noFaceRef.current = false;
    predictionRef.current = null;
    probeRef.current = null;
    recenterOffsetRef.current = { x: 0, y: 0 };
    dwellRef.current = new DwellController();
    smootherRef.current.reset();
    fixationRef.current.reset();
    stickyTargetRef.current = null;
    recenterRunRef.current = null;
    setRecentering(false);
    calibStartRef.current = performance.now();
    if (!trackerRef.current) trackerRef.current = new GazeTracker();
    const tracker = trackerRef.current;
    tracker.setPredictionListener((p) => {
      predictionRef.current = p;
    });
    try {
      await tracker.start();
      if (generation !== generationRef.current) {
        tracker.stop();
        return;
      }
      calibStartRef.current = performance.now();
      setStatus(null);
      setPhase("calibrating");
    } catch (e) {
      if (generation !== generationRef.current) return;
      tracker.stop();
      setStatus(
        cameraDenied(e)
          ? "Camera access is needed for gaze control. Allow the camera, then try again."
          : e instanceof Error && e.message.includes("warm up")
            ? "The camera started but eye tracking did not warm up. Try again, and check the connection is not blocking the page."
            : "Gaze could not start. Check the camera is not in use by another app, then try again.",
      );
      setPhase("error");
    }
  }, []);

  const disable = useCallback(() => {
    generationRef.current++;
    trackerRef.current?.stop();
    dwellRef.current = new DwellController();
    smootherRef.current.reset();
    fixationRef.current.reset();
    stickyTargetRef.current = null;
    recenterRunRef.current = null;
    recenterOffsetRef.current = { x: 0, y: 0 };
    predictionRef.current = null;
    setRecentering(false);
    setStatus(null);
    setNoFace(false);
    noFaceRef.current = false;
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

  const startCalibration = useCallback(async () => {
    // A recalibration must forget what the regression learned, or the new labels blend with the old.
    await trackerRef.current?.resetCalibration();
    probeRef.current = null;
    dwellRef.current = new DwellController();
    smootherRef.current.reset();
    fixationRef.current.reset();
    stickyTargetRef.current = null;
    recenterRunRef.current = null;
    recenterOffsetRef.current = { x: 0, y: 0 };
    setRecentering(false);
    setStatus(null);
    calibStartRef.current = performance.now();
    setPhase("calibrating");
  }, []);

  const recalibrate = useCallback(() => {
    void startCalibration();
  }, [startCalibration]);

  // One-point drift correction: after the head shifts (or the device is passed round) the whole pointer
  // sits to one side. Looking at one dot for a couple of seconds removes that offset.
  const recenter = useCallback(() => {
    recenterRunRef.current = { start: performance.now(), reads: [] };
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

  // The render loop: WebGazer prediction -> drift offset -> filters -> cursor -> dwell -> activation.
  // During calibration the loop places the stationary targets and records labels for the regression.
  useEffect(() => {
    if (phase !== "calibrating" && phase !== "on") return;
    const dwell = dwellRef.current;
    const smoother = smootherRef.current;
    const fixation = fixationRef.current;
    smoother.reset();
    fixation.reset();
    const waypoints = phase === "calibrating" ? buildCalibrationWaypoints() : null;
    let raf = 0;
    let last = performance.now();
    let lastFeatureAt = last;
    let lastPredAt = -1;
    let lastRecordAt = -Infinity;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const elapsed = now - last;
      const dt = Math.min(elapsed, 250);
      last = now;

      if (phase === "calibrating" && (document.hidden || elapsed > 250)) calibStartRef.current += elapsed;
      if (document.hidden) {
        dwell.interrupt(now);
        return;
      }
      const pred = predictionRef.current;
      const fresh = pred !== null && pred.at !== lastPredAt;
      if (pred) lastPredAt = pred.at;

      // Post-calibration probe: is the model actually responding? If not, retry once with the
      // plain camera view (the zoomed one does not track on some cameras), or give up with advice.
      if (phase === "on" && probeRef.current) {
        if (fresh && pred) probeRef.current.seen++;
        if (now > probeRef.current.until) {
          const probe = probeRef.current;
          probeRef.current = null;
          if (probe.seen < PROBE_MIN) {
            if (trackerRef.current?.cameraProfile === "hd") {
              trackerRef.current?.setCameraProfile("safe");
              setStatus("The zoomed camera view is not tracking well - retrying with the plain view. Follow the dots again.");
              trackerRef.current?.stop();
              void startCalibration();
              return;
            }
            trackerRef.current?.stop();
            setStatus("Eye tracking started but is not responding. Check the camera and lighting, then tap the eye button to try again.");
            setPhase("error");
            return;
          }
        }
      }

      if (pred) {
        lastFeatureAt = now;
        if (noFaceRef.current) {
          noFaceRef.current = false;
          setNoFace(false);
        }
      } else if (phase === "on" && !noFaceRef.current && now - lastFeatureAt > NO_FACE_MS) {
        noFaceRef.current = true;
        setNoFace(true);
      }

      const cursor = cursorRef.current;
      if (phase === "calibrating" && waypoints) {
        // Hold each dot still and label the regression only after the eyes have had time to settle.
        // A fresh prediction proves the face is being tracked (recordScreenPosition reads the eyes itself).
        const t = now - calibStartRef.current - CALIBRATION_LEAD_MS;
        if (t >= CALIBRATION_MS) {
          const recorded = trackerRef.current?.recordedSamples ?? 0;
          if (recorded < CALIBRATION_FIT_MIN) {
            trackerRef.current?.stop();
            setStatus(calibrationFailureMessage(recorded));
            setPhase("error");
            return;
          }
          smoother.reset();
          fixation.reset();
          setStatus(calibratedMessage);
          setTimeout(() => setStatus((current) => (current === calibratedMessage ? null : current)), 10000);
          probeRef.current = { until: performance.now() + PROBE_MS, seen: 0 };
          setPhase("on");
          return;
        }
        const fixationState = calibrationFixation(t, waypoints.length, CALIBRATION_MS);
        const { x: dx, y: dy } = waypoints[fixationState.index];
        const dot = calibDotRef.current;
        if (dot) dot.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
        const dotTimer = calibDotTimerRef.current;
        if (dotTimer) {
          const remaining = ((fixationState.index + 1) * CALIBRATION_MS) / waypoints.length - t;
          const label = `${Math.max(1, Math.ceil(remaining / 1000))}s`;
          if (dotTimer.textContent !== label) dotTimer.textContent = label;
        }
        const bar = calibBarRef.current;
        if (bar) bar.style.width = `${Math.min(Math.max(t / CALIBRATION_MS, 0), 1) * 100}%`;
        const timer = calibTimerRef.current;
        if (timer) {
          const secs = Math.max(Math.ceil((CALIBRATION_MS - Math.max(t, 0)) / 1000), 0);
          if (timer.textContent !== `${secs}s`) timer.textContent = `${secs}s`; // avoid a DOM write every frame
        }
        // Label the regression while the eyes have had time to settle on the dot. No prediction
        // gate here: WebGazer emits no predictions until it has training data, and
        // recordScreenPosition itself ignores labels when it cannot see the eyes - so recording
        // unconditionally during the settle window is safe and cannot deadlock the calibration.
        if (fixationState.collect && now - lastRecordAt >= CALIBRATION_RECORD_GAP_MS) {
          lastRecordAt = now;
          trackerRef.current?.recordCalibration(dx, dy);
        }
        return;
      }
      if (!cursor) return;

      // A prediction older than SIGNAL_STALE_MS means the face is gone: hold nothing, pause the dwell.
      const stale = !pred || now - pred.at > SIGNAL_STALE_MS;
      if (stale) {
        dwell.update(now, null, false);
        if (ringRef.current) ringRef.current.style.strokeDashoffset = String(RING_C);
        cursor.style.opacity = "0.25";
        return;
      }
      if (!fresh) return; // between WebGazer predictions: keep showing the last rendered pointer

      // Drift correction: predictions are offset by what Recenter learned.
      const raw = { x: pred.x + recenterOffsetRef.current.x, y: pred.y + recenterOffsetRef.current.y };
      const p0 = smoother.next(raw, dt);
      const jump = clampNum(Math.min(window.innerWidth, window.innerHeight) * 0.12, 60, 140);
      const p = fixation.next(p0, now, jump);

      // Which control is meant: the one under the pointer, else the nearest within reach, and it sticks
      // unless another is clearly closer. Webcam tracking is only good to a fraction of a screen.
      if (now - candidatesRef.current.at > 200) candidatesRef.current = { at: now, items: gazeCandidates() };
      const items = candidatesRef.current.items;
      const previous = items.find((c) => c.el === stickyTargetRef.current)?.box.id ?? null;
      const reach = clampNum(Math.min(window.innerWidth, window.innerHeight) * 0.14, 56, 130);
      const chosen = pickGazeTarget(p, items.map((c) => c.box), { radius: reach, previous });
      const target = chosen == null ? null : (items.find((c) => c.box.id === chosen)?.el ?? null);
      stickyTargetRef.current = target;

      // Magnetic pull: when the gaze lands somewhat near a control, the pointer gravitates to its
      // centre - the farther in, the stronger - so "roughly there" becomes "on the button" without
      // exaggerated eye movements, and the eye sees the cursor sit on what it is about to choose.
      let px = p.x;
      let py = p.y;
      if (target) {
        const box = target.getBoundingClientRect();
        const cx = box.left + box.width / 2;
        const cy = box.top + box.height / 2;
        const t = clampNum(1 - Math.hypot(p.x - cx, p.y - cy) / reach, 0, 1);
        const k = 0.25 + 0.6 * t;
        px = p.x + (cx - p.x) * k;
        py = p.y + (cy - p.y) * k;
      }
      cursor.style.transform = `translate3d(${px}px, ${py}px, 0)`;
      cursor.style.opacity = "1";

      // Drift correction in progress: collect a steady reading on the centre dot; no selecting meanwhile.
      const rc = recenterRunRef.current;
      if (rc) {
        const spent = now - rc.start;
        if (spent > RECENTER_SETTLE_MS) rc.reads.push({ x: pred.x, y: pred.y });
        if (spent > RECENTER_MS) {
          recenterRunRef.current = null;
          const mx = median(rc.reads.map((r) => r.x));
          const my = median(rc.reads.map((r) => r.y));
          if (mx !== null && my !== null && rc.reads.length >= RECENTER_MIN_READS) {
            // Where the model says the person is looking while they look at the centre IS the offset.
            recenterOffsetRef.current = { x: window.innerWidth / 2 - mx, y: window.innerHeight / 2 - my };
            smoother.reset();
            fixation.reset();
            setStatus("Recentered.");
            setTimeout(() => setStatus((current) => (current === "Recentered." ? null : current)), 4000);
          } else {
            setStatus("The camera could not see your eyes during the recenter. Face the camera and try again.");
          }
          setRecentering(false);
        }
        dwell.interrupt(now);
        ringRef.current?.style.setProperty("stroke-dashoffset", String(RING_C));
        return;
      }

      // Edge scrolling asks whether the pointer is actually ON a control, not merely near one.
      const onControl = selectableTarget(document.elementFromPoint(px, py));
      let key: string | null = null;
      if (target) {
        let k = elementKeysRef.current.get(target);
        if (!k) {
          k = nextKeyRef.current++;
          elementKeysRef.current.set(target, k);
        }
        key = String(k);
      }
      // Never let a stale prediction finish a dwell when the tracker has lost the face.
      const state = dwell.update(now, key, !stale);

      if (ringRef.current) ringRef.current.style.strokeDashoffset = String(RING_C * (1 - state.progress));

      // Gaze scrolling: rest the gaze in the top or bottom band to move the page, but only
      // while it is not resting on a control (a dwell there means "press", not "scroll").
      if (!onControl) {
        const h = window.innerHeight;
        let v = 0;
        if (py < EDGE_ZONE) v = -1100 * (1 - py / EDGE_ZONE);
        else if (py > h - EDGE_ZONE) v = 1100 * (1 - (h - py) / EDGE_ZONE);
        if (v) {
          window.scrollBy(0, (v * dt) / 1000);
          candidatesRef.current.at = 0; // the page moved: re-measure the controls
        }
      }

      if (state.progress >= 1 && target && key && state.target === key) {
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
            <span ref={calibDotTimerRef} className="absolute left-0 top-6 -translate-x-1/2 whitespace-nowrap text-sm font-semibold tabular-nums text-on-navy-soft">4s</span>
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

      {status || (phase === "on" && noFace) ? (
        <p
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed z-[70] rounded-field bg-surface p-3 text-sm font-medium leading-snug text-ink shadow-soft ring-1 ring-line"
          // A toast under the header, centred: the one place on the board with no control to lie on top of.
          style={{ top: "calc(var(--eye-edge-v, 8px) + 76px)", insetInlineStart: "50%", transform: "translateX(-50%)", width: "max-content", maxWidth: "min(32rem, calc(100vw - 2 * max(24px, var(--eye-edge, 24px))))", textAlign: "center" }}
        >
          {status ?? "No face seen - sit centred in front of the camera."}
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
