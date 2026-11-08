// Webcam gaze tracking for the gaze input channel, wrapping WebGazer.js (brownhci).
// Everything runs in the browser: the webcam stream and the face-mesh regression stay on the
// device; no server, no API key. WebGazer is loaded as its self-contained UMD bundle from
// /webgazer/webgazer.js (its ESM dependency graph does not survive the bundler), and the
// face-mesh solution assets are served from public/mediapipe/face_mesh, so no CDN is needed.
// Privacy rule (AGENTS.md): camera frames are processed locally and are never uploaded, stored,
// or logged; regression data never persists between sessions (saveDataAcrossSessions(false)).

import type { WebGazerInstance } from "./webgazer";

export type GazePrediction = { x: number; y: number; at: number };

/** Where the WebGazer bundle and its face-mesh solution files live, relative to the site root. */
const BUNDLE_SRC = "/webgazer/webgazer.js";
const SOLUTION_PATH = "/mediapipe/face_mesh";

/** WebGazer's begin() only settles once its loop is paused, so readiness is polled instead. */
const READY_TIMEOUT_MS = 15000;

/** Load the WebGazer bundle once; later calls resolve immediately with the running instance. */
function loadWebgazer(): Promise<WebGazerInstance> {
  if (typeof window === "undefined") return Promise.reject(new Error("Gaze can only start in the browser."));
  if (window.webgazer) return Promise.resolve(window.webgazer);
  return new Promise((resolve, reject) => {
    const done = () => {
      if (window.webgazer) resolve(window.webgazer);
      else reject(new Error("The eye tracking script loaded but did not initialise."));
    };
    const existing = document.querySelector<HTMLScriptElement>("script[data-synapse-webgazer]");
    if (existing) {
      existing.addEventListener("load", done, { once: true });
      existing.addEventListener("error", () => reject(new Error("The eye tracking script failed to load.")), { once: true });
      if (window.webgazer) done();
      return;
    }
    const script = document.createElement("script");
    script.src = BUNDLE_SRC;
    script.async = true;
    script.dataset.synapseWebgazer = "";
    script.addEventListener("load", done, { once: true });
    script.addEventListener("error", () => reject(new Error("The eye tracking script failed to load.")), { once: true });
    document.head.appendChild(script);
  });
}

export class GazeTracker {
  private wg: WebGazerInstance | null = null;
  private starting: Promise<void> | null = null;
  private stopRequested = false;
  private predictCb: ((p: GazePrediction | null) => void) | null = null;
  private recorded = 0;

  /** Receives the newest prediction (viewport px) whenever WebGazer's loop emits one, or null when it cannot see a face. */
  setPredictionListener(cb: ((p: GazePrediction | null) => void) | null) {
    this.predictCb = cb;
  }

  /** How many calibration labels have been recorded so far. */
  get recordedSamples() {
    return this.recorded;
  }

  /**
   * Ask for the camera and warm WebGazer up. Idempotent: concurrent calls share one start (React
   * Strict Mode double-invokes effects in dev), and stop() during a start cancels the remainder.
   */
  start(): Promise<void> {
    if (this.starting) return this.starting;
    if (this.wg) return Promise.resolve();
    this.stopRequested = false;
    const run = this.begin().finally(() => {
      if (this.starting === run) this.starting = null;
    });
    this.starting = run;
    return run;
  }

  private async begin(): Promise<void> {
    const wg = await loadWebgazer();
    if (this.stopRequested) return;

    // One-time configuration: everything off except raw predictions - our own UI draws the cursor.
    wg.saveDataAcrossSessions(false); // privacy: nothing persists between sessions or page loads
    wg.params.faceMeshSolutionPath = SOLUTION_PATH;
    // A bigger, sharper face means finer iris landmarks, which is what the eye patches are built
    // from: ask for 720p and zoom in when the camera supports it (gracefully ignored otherwise).
    wg.params.camConstraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user",
        advanced: [{ zoom: { ideal: 2 } }],
      },
      audio: false,
    };
    wg.showVideo(false);
    wg.showPredictionPoints(false);
    wg.showFaceOverlay(false);
    wg.showFaceFeedbackBox(false);
    wg.applyKalmanFilter(true); // WebGazer's own jitter filter; our One-Euro sits on top
    wg.setGazeListener((data) => {
      if (!this.predictCb) return;
      this.predictCb(data ? { x: data.x, y: data.y, at: performance.now() } : null);
    });

    // begin() rejects when the camera is denied or missing; it does not resolve while the
    // prediction loop runs, so success is "the video frame data has arrived".
    const started = wg.begin(() => {});
    await new Promise<void>((resolve, reject) => {
      started.catch(reject);
      const t0 = performance.now();
      const check = () => {
        if (this.stopRequested) {
          resolve();
          return;
        }
        if (wg.isReady()) {
          resolve();
          return;
        }
        if (performance.now() - t0 > READY_TIMEOUT_MS) {
          reject(new Error("The camera started but eye tracking did not warm up."));
          return;
        }
        setTimeout(check, 100);
      };
      setTimeout(check, 150);
    });
    if (this.stopRequested) {
      this.stop();
      return;
    }
    // Calibration labels must come only from our explicit calibration dots: WebGazer's built-in
    // click/move recording would otherwise teach the regression from ordinary mouse use.
    wg.removeMouseEventListeners();
    this.wg = wg;
  }

  /** Train the regression: the person is looking at viewport (x, y) right now. */
  recordCalibration(x: number, y: number) {
    this.recorded++;
    this.wg?.recordScreenPosition(x, y, "click");
  }

  /** Forget everything the regression learned (used before a recalibration). */
  async resetCalibration() {
    this.recorded = 0;
    try {
      await this.wg?.clearData();
    } catch {
      // clearData touches storage backends; with data saving off it may have nothing to do.
    }
  }

  /** Stop everything: the camera light must go out the moment gaze is disabled. */
  stop() {
    this.stopRequested = true;
    const wg = this.wg;
    this.wg = null;
    this.recorded = 0;
    this.setPredictionListener(null);
    if (!wg) return;
    try {
      wg.stopVideo();
    } catch {
      // The stream may already be gone (failed start).
    }
    wg.clearGazeListener();
    wg.end();
  }
}
