// What the screen on show wants from gaze control, and where the layer in layout.tsx has got to.
// The layer renders nothing (and keeps the camera off) until a screen declares it, and does not start
// the camera until the clinician has said go, so both people can be looking. The layer reports its
// phase and any failure back here so the screen can show them in one place.
// A tiny store rather than window events: on a fresh page load the screen's effect runs before the
// layer is listening.
export type GazePhaseName = "off" | "starting" | "calibrating" | "on" | "error";

let available = false;
let requested = false;
let skipped = false;
let phase: GazePhaseName = "off";
let edgeWide = false; // the clinician said the screen edge lights up brightly: keep controls further in
let error: string | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

/** A screen where the patient uses Eye mode calls this: true while the board is up, false when it goes. */
export function setGazeAvailable(next: boolean) {
  if (available === next) return;
  available = next;
  if (!next) {
    requested = false;
    skipped = false;
    error = null;
  }
  notify();
}

/** The clinician has said go: camera and calibration begin now. */
export function requestGazeStart() {
  if (!available || requested) return;
  requested = true;
  error = null;
  notify();
}

/** Calibration was cancelled or failed: back to the ready step so it can be tried again together. */
export function cancelGazeRequest() {
  if (!requested) return;
  requested = false;
  notify();
}

/** The clinician chose touch or keyboard for now: the ready step steps aside until the board is left. */
export function skipGaze() {
  if (skipped) return;
  skipped = true;
  notify();
}

/** The person has finished communicating: camera and tracking off now. Setup can be reopened from the board. */
export function stopGaze() {
  if (!requested && skipped) return;
  requested = false;
  skipped = true;
  notify();
}

/** Bring the ready step back after it was skipped, so eye control can still be set up. */
export function reopenGaze() {
  if (!skipped) return;
  skipped = false;
  notify();
}

/** The clinician says the screen edge lights up (e.g. Mac Edge Light): keep everything further in. Kept for the whole visit. */
export function setGazeEdgeWide(next: boolean) {
  if (edgeWide === next) return;
  edgeWide = next;
  notify();
}

/** Reported by the layer. */
export function setGazePhase(next: GazePhaseName) {
  if (phase === next) return;
  phase = next;
  notify();
}

/** Reported by the layer when something stops it starting. */
export function setGazeError(next: string | null) {
  if (error === next) return;
  error = next;
  notify();
}

export function subscribeGaze(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getGazeAvailable = () => available;
export const getGazeRequested = () => requested;
export const getGazeSkipped = () => skipped;
export const getGazeEdgeWide = () => edgeWide;
export const getGazePhase = () => phase;
export const getGazeError = () => error;
