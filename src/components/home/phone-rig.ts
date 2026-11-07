import type { Group, Object3D } from "three";

/**
 * The 3D phone renderer used by every phone on the home page (phone-3d.tsx)
 * (several per page). Akash's iPhone model lives at /models/iphone.glb.
 *
 * How the HTML screen stays glued to the model: the WebGL camera is a perspective camera at
 * CAM_DIST, and the HTML glass gets the same rotation plus a CSS perspective() with the same focal
 * length (see glassTransform), so both projections agree. The glass content is laid out at a
 * fixed design size (DESIGN_W x DESIGN_H) and scaled, so a phone of any size shows the same screen.
 */

// Model units are metres. Body ~78.5 x 163 mm; the glass is 73 x 158.5 mm.
export const BODY_W = 0.0785;
export const BODY_H = 0.1633;
const BODY_CX = -0.00025;
const BODY_CY = 0.08167;
const BODY_CZ = -0.0016;
const SCREEN_W = 0.073;
const SCREEN_H = 0.15849;
const SCREEN_Z = 0.004322 - BODY_CZ; // glass plane, relative to the rotation centre

export const ASPECT = BODY_W / BODY_H;
export const PAD_X = 0.16; // canvas bleed so a turned phone is never clipped
export const PAD_Y = 0.07;
export const CAM_DIST = 0.5; // metres: close enough for real perspective
export const REST_YAW = -0.1;

/** The screen is laid out at this size, then scaled onto the glass. */
export const DESIGN_W = 304;
export const DESIGN_H = Math.round((DESIGN_W * SCREEN_H) / SCREEN_W);
export const GLASS_RADIUS = Math.round((0.0085 / SCREEN_W) * DESIGN_W);

/** CSS transform that puts the HTML glass exactly on the model's glass. k = CSS px per metre. */
export function glassTransform(k: number, yaw: number, pitch: number) {
  const s = (SCREEN_W * k * 0.992) / DESIGN_W;
  // CSS rotateX is opposite in sign to three's rotation.x.
  return `perspective(${k * CAM_DIST}px) rotateX(${-pitch}rad) rotateY(${yaw}rad) translateZ(${SCREEN_Z * k}px) scale(${s})`;
}

/** The glass laid flat on the CSS bezel (no WebGL yet, or none at all). */
export function flatGlassTransform(k: number) {
  return `scale(${(SCREEN_W * k * 0.992) / DESIGN_W})`;
}

/** Faces the viewer enough to show the HTML glass. */
export function facing(yaw: number) {
  return Math.cos(yaw) > 0.02;
}

type Gltf = { scene: Group };
let modelPromise: Promise<Gltf> | null = null;

function loadModel(): Promise<Gltf> {
  modelPromise ??= import("three/examples/jsm/loaders/GLTFLoader.js").then(
    ({ GLTFLoader }) =>
      new Promise<Gltf>((resolve, reject) => {
        new GLTFLoader().load("/models/iphone.glb", (g) => resolve(g as unknown as Gltf), undefined, reject);
      }),
  );
  modelPromise.catch(() => {
    modelPromise = null;
  });
  return modelPromise;
}

export type Rig = {
  canvas: HTMLCanvasElement;
  /** Size the canvas for a phone body this many CSS px wide; returns k (CSS px per metre). */
  setWidth: (bodyWidthPx: number) => number;
  render: (yaw: number, pitch: number) => void;
  dispose: () => void;
};

/** Rejects when WebGL or the model is unavailable; callers keep their CSS fallback. */
export async function createRig(): Promise<Rig> {
  const THREE = await import("three");
  const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
  const gltf = await loadModel();

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
  const scene = new THREE.Scene();
  scene.environment = env.texture;
  const key = new THREE.DirectionalLight(0xdfeaff, 1.6);
  key.position.set(-0.4, 0.6, 0.8);
  scene.add(key);

  const pivot = new THREE.Group();
  const model = gltf.scene.clone(true) as Object3D;
  model.position.set(-BODY_CX, -BODY_CY, -BODY_CZ);
  // No manufacturer branding on our page: the back stays plain.
  const logo = model.getObjectByName("Back_Logo");
  if (logo) logo.visible = false;
  pivot.add(model);
  scene.add(pivot);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 3);
  camera.position.z = CAM_DIST;

  let lastW = 0;
  let k = 1;
  return {
    canvas: renderer.domElement,
    setWidth(w) {
      if (w === lastW || w <= 0) return k;
      lastW = w;
      k = w / BODY_W;
      const cw = w * (1 + PAD_X);
      const ch = BODY_H * k * (1 + PAD_Y);
      renderer.setSize(cw, ch, false);
      // Focal length in px = k * CAM_DIST, so the plane through the pivot is exactly k px per metre.
      camera.aspect = cw / ch;
      camera.fov = (2 * Math.atan(ch / 2 / (k * CAM_DIST)) * 180) / Math.PI;
      camera.updateProjectionMatrix();
      return k;
    },
    render(yaw, pitch) {
      pivot.rotation.set(pitch, yaw, 0);
      renderer.render(scene, camera);
    },
    dispose() {
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
