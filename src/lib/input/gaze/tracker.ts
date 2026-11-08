// On-device webcam face tracking for the gaze input channel, wrapping @mediapipe/tasks-vision.
// Privacy rule (AGENTS.md): camera frames are processed locally in WASM and are never uploaded,
// stored, or logged. The face model and WASM runtime are static files fetched once over the
// network when gaze is enabled; no video or landmark data leaves the device.
import { FaceLandmarker, FilesetResolver, type NormalizedLandmark } from "@mediapipe/tasks-vision";

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export class GazeTracker {
  private landmarker: FaceLandmarker | null = null;
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private lastFrameTime = -1;
  private detectErrors = 0;
  private generation = 0;

  /** Ask for the camera and load the face model. Throws with a plain message on failure. */
  async start(video: HTMLVideoElement): Promise<void> {
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

  /** True when inference keeps failing (bad lighting, unsupported camera) — the UI can say so. */
  get unhealthy() {
    return this.detectErrors > 60;
  }

  /** Stop everything: the camera light must go out the moment gaze is disabled. */
  stop() {
    this.generation++;
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
