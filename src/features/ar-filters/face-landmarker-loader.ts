import type { FaceLandmarker } from "@mediapipe/tasks-vision";

const WASM_PATHS = [
  "/mediapipe/wasm",
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm",
];
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

let loadPromise: Promise<FaceLandmarker> | null = null;
let landmarker: FaceLandmarker | null = null;

export function isFaceLandmarkerReady() {
  return landmarker !== null;
}

export async function loadFaceLandmarker(
  preferGpu = false,
): Promise<FaceLandmarker> {
  if (landmarker) return landmarker;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const { FaceLandmarker, FilesetResolver } = await import(
      "@mediapipe/tasks-vision"
    );

    let lastError: unknown = null;

    for (const wasmPath of WASM_PATHS) {
      try {
        const vision = await FilesetResolver.forVisionTasks(wasmPath);

        const create = (delegate: "GPU" | "CPU") =>
          FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: MODEL_URL,
              delegate,
            },
            runningMode: "IMAGE",
            numFaces: 1,
            minFaceDetectionConfidence: 0.55,
            minFacePresenceConfidence: 0.55,
            minTrackingConfidence: 0.55,
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: false,
          });

        const order: Array<"GPU" | "CPU"> = preferGpu
          ? ["GPU", "CPU"]
          : ["CPU", "GPU"];

        let created: FaceLandmarker | null = null;
        for (const delegate of order) {
          try {
            created = await create(delegate);
            break;
          } catch {
            /* try next delegate */
          }
        }

        if (!created) {
          throw new Error("No FaceLandmarker delegate available");
        }

        landmarker = created;
        console.info("[AR] Face landmarker ready via", wasmPath);
        return landmarker;
      } catch (err) {
        lastError = err;
        console.warn(`[AR] WASM load failed for ${wasmPath}:`, err);
      }
    }

    throw lastError ?? new Error("Face landmarker WASM unavailable");
  })();

  try {
    return await loadPromise;
  } catch (err) {
    loadPromise = null;
    console.error("[AR] Face landmarker failed to load:", err);
    throw err;
  }
}

export function getFaceLandmarker() {
  return landmarker;
}

export function disposeFaceLandmarker() {
  landmarker?.close();
  landmarker = null;
  loadPromise = null;
}
