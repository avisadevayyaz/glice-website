export type ArPerfProfile = {
  outputFps: number;
  maxOutputEdge: number;
  analysisWidth: number;
  /** Run face detect every N video frames (1 = every frame). */
  detectEveryN: number;
  /** Smoothing when a new detection lands (0–1, higher = snappier). */
  detectSmoothing: number;
  /** Per-render-frame catch-up toward latest detection (0–1). */
  renderSmoothing: number;
  preferGpu: boolean;
};

export function getArPerfProfile(): ArPerfProfile {
  const mobile =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 720px)").matches;

  if (mobile) {
    return {
      outputFps: 24,
      maxOutputEdge: 540,
      analysisWidth: 256,
      detectEveryN: 2,
      detectSmoothing: 0.7,
      renderSmoothing: 0.52,
      preferGpu: false,
    };
  }

  return {
    outputFps: 30,
    maxOutputEdge: 720,
    analysisWidth: 320,
    detectEveryN: 2,
    detectSmoothing: 0.75,
    renderSmoothing: 0.58,
    preferGpu: true,
  };
}
