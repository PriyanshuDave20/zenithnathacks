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

  /** Ask for the camera and load the face model. Throws with a plain message on failure. */
  async start(video: HTMLVideoElement): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      audio: false,
    });
    video.srcObject = this.stream;
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
    try {
      this.landmarker = await FaceLandmarker.createFromOptions(fileset, options("GPU"));
    } catch {
      this.landmarker = await FaceLandmarker.createFromOptions(fileset, options("CPU"));
    }
    this.video = video;
  }

  /**
   * One inference pass over the newest camera frame. Returns null between camera frames (the
   * webcam delivers ~30 fps; the render loop runs faster, so this throttles the model itself).
   */
  detect(nowMs: number): NormalizedLandmark[] | null {
    if (!this.landmarker || !this.video || this.video.readyState < 2) return null;
    if (this.video.currentTime === this.lastFrameTime) return null;
    this.lastFrameTime = this.video.currentTime;
    const result = this.landmarker.detectForVideo(this.video, nowMs);
    return result.faceLandmarks[0] ?? null;
  }

  /** Stop everything: the camera light must go out the moment gaze is disabled. */
  stop() {
    this.landmarker?.close();
    this.landmarker = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.video) this.video.srcObject = null;
    this.video = null;
    this.lastFrameTime = -1;
  }
}
