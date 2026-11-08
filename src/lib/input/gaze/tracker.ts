// On-device webcam face tracking for the gaze input channel, wrapping @mediapipe/tasks-vision.
// Privacy rule (AGENTS.md): camera frames are processed locally in WASM and are never uploaded,
// stored, or logged. The face model and WASM runtime are static files fetched once over the
// network when gaze is enabled; no video or landmark data leaves the device.
import { FaceLandmarker, FilesetResolver, type NormalizedLandmark } from "@mediapipe/tasks-vision";

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

let infoRouted = false;
/**
 * MediaPipe's WASM runtime writes informational lines ("INFO: Created TensorFlow Lite XNNPACK
 * delegate for CPU.") to console.error. Next's dev overlay shows every console.error as an error and
 * covers the page with it. Route those lines to console.info; real errors still pass through.
 */
function routeMediapipeInfo() {
  if (infoRouted || typeof console === "undefined") return;
  infoRouted = true;
  const original = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && /^INFO: /.test(args[0])) {
      console.info(...args);
      return;
    }
    original.apply(console, args);
  };
}

export class GazeTracker {
  private landmarker: FaceLandmarker | null = null;
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private lastFrameTime = -1;
  private detectErrors = 0;
  private generation = 0;
  private starting: Promise<void> | null = null;

  /**
   * Ask for the camera and load the face model. Throws with a plain message on failure.
   * Concurrent calls share one start (React Strict Mode double-invokes effects in dev, and the
   * camera must only be requested once); stop() drops the shared start so a start right after a
   * stop is always a fresh one rather than the cancelled one.
   */
  start(video: HTMLVideoElement): Promise<void> {
    if (this.starting) return this.starting;
    if (this.landmarker) return Promise.resolve();
    const run = this.begin(video).finally(() => {
      if (this.starting === run) this.starting = null;
    });
    this.starting = run;
    return run;
  }

  private async begin(video: HTMLVideoElement): Promise<void> {
    routeMediapipeInfo();
    const generation = ++this.generation;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      audio: false,
    });
    if (generation !== this.generation) { stream.getTracks().forEach(t => t.stop()); throw new Error("Tracking cancelled"); }
    this.stream = stream;
    this.video = video;
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();

    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
    const options = (delegate: "GPU" | "CPU") => ({
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: "VIDEO" as const,
      numFaces: 1,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });
    // CPU delegate on purpose: the GPU/WebGL path throws intermittently mid-run on some
    // machines ("finishProcessing" errors), and XNNPACK CPU keeps ~30 fps with none of that.
    const landmarker = await FaceLandmarker.createFromOptions(fileset, options("CPU"));
    if (generation !== this.generation) { landmarker.close(); throw new Error("Tracking cancelled"); }
    this.landmarker = landmarker;
  }

  /**
   * One inference pass over the newest camera frame. Returns undefined between camera frames (the
   * webcam delivers ~30 fps; the render loop runs faster, so this throttles the model itself).
   * Null means a new frame had no usable face; callers must cancel dwell for that frame.
   */
  detect(nowMs: number): NormalizedLandmark[] | null | undefined {
    if (!this.landmarker || !this.video) return null;
    if (this.video.readyState < 2 || this.video.videoWidth === 0) return null;
    if (this.video.currentTime === this.lastFrameTime) return undefined;
    this.lastFrameTime = this.video.currentTime;
    try {
      const result = this.landmarker.detectForVideo(this.video, nowMs);
      this.detectErrors = 0;
      return result.faceLandmarks[0] ?? null;
    } catch {
      // Warmup or a bad frame: skip it instead of crashing the render loop or spamming the
      // console. A long run of failures is reported through `unhealthy` instead.
      this.detectErrors++;
      return null;
    }
  }

  private lumaCanvas: HTMLCanvasElement | null = null;

  /**
   * Brightness (0..1) of the face in the current camera frame, measured on a 16 x 16 canvas that is
   * read straight away and discarded: nothing is stored, logged or sent. Used to notice that the room
   * has got darker or brighter since calibration, which shifts the shadows around the eyes.
   */
  faceLuma(landmarks: NormalizedLandmark[]): number | null {
    const v = this.video;
    if (!v || v.readyState < 2 || v.videoWidth === 0 || typeof document === "undefined") return null;
    const l = landmarks[234];
    const r = landmarks[454];
    const t = landmarks[10];
    const b = landmarks[152];
    if (!l || !r || !t || !b) return null;
    const x0 = Math.max(0, Math.min(l.x, r.x) * v.videoWidth);
    const y0 = Math.max(0, Math.min(t.y, b.y) * v.videoHeight);
    const sw = Math.min(v.videoWidth - x0, Math.max(8, Math.abs(r.x - l.x) * v.videoWidth));
    const sh = Math.min(v.videoHeight - y0, Math.max(8, Math.abs(b.y - t.y) * v.videoHeight));
    if (sw < 8 || sh < 8) return null;
    try {
      const canvas = (this.lumaCanvas ??= document.createElement("canvas"));
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(v, x0, y0, sw, sh, 0, 0, 16, 16);
      const d = ctx.getImageData(0, 0, 16, 16).data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      return sum / ((d.length / 4) * 255);
    } catch {
      return null;
    }
  }

  /** Pixel geometry of the actual video, independent of CSS mirroring or display size. */
  get frameAspectRatio() {
    return this.video && this.video.videoWidth > 0 && this.video.videoHeight > 0
      ? this.video.videoWidth / this.video.videoHeight : 1;
  }

  /** True when inference keeps failing (bad lighting, unsupported camera) — the UI can say so. */
  get unhealthy() {
    return this.detectErrors > 60;
  }

  /** Stop everything: the camera light must go out the moment gaze is disabled. */
  stop() {
    this.generation++;
    this.starting = null;
    this.landmarker?.close();
    this.landmarker = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.video) this.video.srcObject = null;
    this.video = null;
    this.lastFrameTime = -1;
    this.detectErrors = 0;
  }
}
