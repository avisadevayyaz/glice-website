import { preloadAllFilterAssets } from "./assets/asset-loader";
import { getArPerfProfile } from "./perf-config";
import {
  getFaceTransform,
  getFallbackFaceTransform,
  smoothFaceTransform,
} from "./landmark-utils";
import {
  getFaceLandmarker,
  loadFaceLandmarker,
} from "./face-landmarker-loader";
import { applyArOverlay, drawBaseFrame } from "./renderers";
import type { ArFilterId, FaceLandmarks, FaceTransform } from "./types";

export class ArFilterPipeline {
  private sourceVideo: HTMLVideoElement;
  private analysisCanvas: HTMLCanvasElement;
  private analysisCtx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rawStream: MediaStream | null = null;
  private outputStream: MediaStream | null = null;
  private filterId: ArFilterId = "none";
  private rafId: number | null = null;
  private running = false;
  private detecting = false;
  private lastRenderMs = 0;
  private frameCounter = 0;
  private cachedLandmarks: FaceLandmarks | null = null;
  private targetFace: FaceTransform | null = null;
  private displayFace: FaceTransform | null = null;
  private detectFailures = 0;
  private mirror = true;
  private perf = getArPerfProfile();
  private analysisSized = false;

  constructor() {
    this.sourceVideo = document.createElement("video");
    this.sourceVideo.muted = true;
    this.sourceVideo.playsInline = true;
    this.sourceVideo.setAttribute("playsinline", "true");
    this.sourceVideo.setAttribute("webkit-playsinline", "true");

    this.analysisCanvas = document.createElement("canvas");
    const analysisCtx = this.analysisCanvas.getContext("2d", {
      alpha: false,
      desynchronized: true,
    });
    if (!analysisCtx) throw new Error("Analysis canvas unavailable");
    analysisCtx.imageSmoothingEnabled = false;
    this.analysisCtx = analysisCtx;

    this.canvas = document.createElement("canvas");
    const ctx = this.canvas.getContext("2d", {
      alpha: false,
      desynchronized: true,
    });
    if (!ctx) throw new Error("Canvas 2D unavailable");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "medium";
    this.ctx = ctx;
  }

  getOutputStream() {
    return this.outputStream;
  }

  getActiveFilter() {
    return this.filterId;
  }

  async start(rawStream: MediaStream, filterId: ArFilterId): Promise<MediaStream> {
    this.stopInternal(false);
    this.perf = getArPerfProfile();
    this.rawStream = rawStream;
    this.filterId = filterId;
    this.cachedLandmarks = null;
    this.targetFace = null;
    this.displayFace = null;
    this.detectFailures = 0;
    this.analysisSized = false;
    this.lastRenderMs = 0;
    this.frameCounter = 0;

    if (!rawStream.getVideoTracks()[0]) {
      throw new Error("No camera video track available for AR filters");
    }

    this.sourceVideo.srcObject = rawStream;

    await this.waitForVideoReady();
    await this.ensureVideoPlaying();
    this.syncCanvasSize();
    this.syncAnalysisSize();

    if (filterId !== "none") {
      await Promise.all([
        loadFaceLandmarker(this.perf.preferGpu),
        preloadAllFilterAssets(),
      ]);
    }

    this.running = true;
    this.paintFrame();
    this.scheduleRender();

    this.outputStream = this.canvas.captureStream(this.perf.outputFps);
    for (const track of rawStream.getAudioTracks()) {
      this.outputStream.addTrack(track);
    }

    return this.outputStream;
  }

  async setFilter(filterId: ArFilterId) {
    this.filterId = filterId;
    if (filterId !== "none" && !getFaceLandmarker()) {
      await loadFaceLandmarker(this.perf.preferGpu);
    }
    if (filterId === "none") {
      this.cachedLandmarks = null;
      this.targetFace = null;
      this.displayFace = null;
    }
  }

  stop() {
    this.stopInternal(true);
  }

  private async waitForVideoReady() {
    if (
      this.sourceVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      this.sourceVideo.videoWidth > 0
    ) {
      return;
    }

    await new Promise<void>((resolve) => {
      const done = () => {
        this.sourceVideo.removeEventListener("loadeddata", done);
        this.sourceVideo.removeEventListener("loadedmetadata", done);
        resolve();
      };
      this.sourceVideo.addEventListener("loadeddata", done);
      this.sourceVideo.addEventListener("loadedmetadata", done);
      window.setTimeout(done, 2000);
    });
  }

  private async ensureVideoPlaying() {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        await this.sourceVideo.play();
        if (this.sourceVideo.videoWidth > 0) return;
      } catch {
        /* retry */
      }
      await new Promise((resolve) => window.setTimeout(resolve, 150));
    }
  }

  private stopInternal(clearVideo: boolean) {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.outputStream?.getVideoTracks().forEach((track) => track.stop());
    this.outputStream = null;
    this.cachedLandmarks = null;
    this.targetFace = null;
    this.displayFace = null;
    this.detectFailures = 0;
    this.detecting = false;
    this.frameCounter = 0;

    if (clearVideo) {
      this.sourceVideo.srcObject = null;
      this.rawStream = null;
    }
  }

  private syncCanvasSize() {
    const vw = this.sourceVideo.videoWidth || 640;
    const vh = this.sourceVideo.videoHeight || 480;
    const scale = Math.min(1, this.perf.maxOutputEdge / Math.max(vw, vh));
    const width = Math.max(1, Math.round(vw * scale));
    const height = Math.max(1, Math.round(vh * scale));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  private syncAnalysisSize() {
    const vw = this.sourceVideo.videoWidth;
    const vh = this.sourceVideo.videoHeight;
    if (vw <= 0 || vh <= 0) return;

    const aspect = vh / vw;
    const width = this.perf.analysisWidth;
    const height = Math.max(1, Math.round(width * aspect));
    if (
      !this.analysisSized ||
      this.analysisCanvas.width !== width ||
      this.analysisCanvas.height !== height
    ) {
      this.analysisCanvas.width = width;
      this.analysisCanvas.height = height;
      this.analysisSized = true;
    }
  }

  private drawAnalysisFrame() {
    const { sourceVideo, analysisCanvas, analysisCtx, mirror } = this;
    const w = analysisCanvas.width;
    const h = analysisCanvas.height;

    analysisCtx.save();
    if (mirror) {
      analysisCtx.translate(w, 0);
      analysisCtx.scale(-1, 1);
    }
    analysisCtx.drawImage(sourceVideo, 0, 0, w, h);
    analysisCtx.restore();
  }

  private applyDetection(landmarks: FaceLandmarks) {
    this.cachedLandmarks = landmarks;
    const { canvas } = this;
    const measured = getFaceTransform(landmarks, canvas.width, canvas.height);
    this.targetFace = smoothFaceTransform(
      this.targetFace,
      measured,
      this.perf.detectSmoothing,
    );
  }

  private advanceDisplayFace() {
    if (!this.targetFace) return;
    this.displayFace = smoothFaceTransform(
      this.displayFace,
      this.targetFace,
      this.perf.renderSmoothing,
    );
  }

  private async runDetection() {
    const landmarker = getFaceLandmarker();
    if (!landmarker || this.filterId === "none") return;

    const { sourceVideo } = this;
    if (
      sourceVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      sourceVideo.videoWidth <= 0
    ) {
      return;
    }

    if (this.detectFailures > 8) return;

    this.detecting = true;
    try {
      this.syncAnalysisSize();
      this.drawAnalysisFrame();

      const result = landmarker.detect(this.analysisCanvas);
      const detected = result.faceLandmarks?.[0] ?? null;

      if (detected) {
        this.applyDetection(detected);
        this.detectFailures = 0;
      }
    } catch (err) {
      this.detectFailures += 1;
      if (this.detectFailures <= 2) {
        console.warn("[AR] Face detection failed:", err);
      }
    } finally {
      this.detecting = false;
    }
  }

  private paintFrame() {
    const { canvas, ctx, sourceVideo } = this;

    if (
      sourceVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      sourceVideo.videoWidth <= 0
    ) {
      return;
    }

    this.syncCanvasSize();

    const filterId = this.filterId;
    drawBaseFrame(ctx, sourceVideo, canvas.width, canvas.height, this.mirror);

    if (filterId === "none") return;

    this.advanceDisplayFace();

    const face =
      this.displayFace ??
      this.targetFace ??
      getFallbackFaceTransform(canvas.width, canvas.height);

    applyArOverlay(filterId, {
      ctx,
      width: canvas.width,
      height: canvas.height,
      landmarks: this.cachedLandmarks,
      face,
      mirror: this.mirror,
    });
  }

  private onFrame = (now: number) => {
    if (!this.running) return;

    const frameBudget = 1000 / this.perf.outputFps;
    if (now - this.lastRenderMs >= frameBudget) {
      this.paintFrame();
      this.lastRenderMs = now;

      this.frameCounter += 1;
      if (
        this.filterId !== "none" &&
        !this.detecting &&
        this.frameCounter % this.perf.detectEveryN === 0
      ) {
        void this.runDetection();
      }
    }

    this.scheduleRender();
  };

  private scheduleRender = () => {
    if (!this.running) return;

    const video = this.sourceVideo;

    if ("requestVideoFrameCallback" in video) {
      video.requestVideoFrameCallback(this.onFrame);
      return;
    }

    this.rafId = requestAnimationFrame(this.onFrame);
  };
}

let sharedPipeline: ArFilterPipeline | null = null;

export function getArFilterPipeline() {
  if (!sharedPipeline) sharedPipeline = new ArFilterPipeline();
  return sharedPipeline;
}
