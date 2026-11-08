// Minimal ambient types for WebGazer.js (the package ships none and @types/webgazer does not exist).
// The library is loaded as its self-contained UMD bundle from /webgazer/webgazer.js (script tag), not
// imported - its ESM dependency graph does not survive the bundler. Only the surface the gaze input
// channel uses is declared.
export interface WebGazerPrediction {
  x: number;
  y: number;
  all?: unknown;
}

export interface WebGazerInstance {
  /** Starts the camera and the prediction loop. Note: the returned promise only settles once
   * the loop is paused (end/pause) - readiness must be polled with isReady() instead. */
  begin(onFail?: () => void): Promise<WebGazerInstance>;
  /** Stops the loop and removes WebGazer's DOM additions; begin() can be called again after. */
  end(): WebGazerInstance;
  pause(): WebGazerInstance;
  resume(): Promise<WebGazerInstance>;
  isReady(): boolean;
  /** Stops the camera stream (end() alone leaves it running). */
  stopVideo(): WebGazerInstance;
  setGazeListener(cb: ((data: WebGazerPrediction | null, elapsedTime: number) => void) | null): WebGazerInstance;
  clearGazeListener(): WebGazerInstance;
  /** Trains the regression: the user is looking at viewport (x, y) right now. */
  recordScreenPosition(x: number, y: number, eventType?: "click" | "move"): WebGazerInstance;
  addMouseEventListeners(): WebGazerInstance;
  /** Removes WebGazer's click/move data recording (ambient mouse clicks would mislabel samples). */
  removeMouseEventListeners(): WebGazerInstance;
  clearData(): Promise<WebGazerInstance>;
  showVideo(v: boolean): WebGazerInstance;
  showPredictionPoints(v: boolean): WebGazerInstance;
  showFaceOverlay(v: boolean): WebGazerInstance;
  showFaceFeedbackBox(v: boolean): WebGazerInstance;
  applyKalmanFilter(v: boolean): WebGazerInstance;
  /** False here: no regression data may persist between sessions. */
  saveDataAcrossSessions(v: boolean): WebGazerInstance;
  params: { faceMeshSolutionPath: string; [key: string]: unknown };
}

declare global {
  interface Window {
    webgazer?: WebGazerInstance;
  }
}
