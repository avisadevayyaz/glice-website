import type { FaceLandmarks, FaceTransform } from "./types";

/** MediaPipe Face Mesh landmark indices */
export const LM = {
  forehead: 10,
  chin: 152,
  noseTip: 1,
  noseBridge: 6,
  leftEyeOuter: 33,
  leftEyeInner: 133,
  rightEyeInner: 362,
  rightEyeOuter: 263,
  leftCheek: 234,
  rightCheek: 454,
  leftTemple: 127,
  rightTemple: 356,
  mouthLeft: 61,
  mouthRight: 291,
  upperLip: 13,
} as const;

export function toPixel(
  landmark: { x: number; y: number },
  width: number,
  height: number,
) {
  return { x: landmark.x * width, y: landmark.y * height };
}

export function dist(
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function midpoint(
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function lm(
  landmarks: FaceLandmarks,
  index: number,
  width: number,
  height: number,
) {
  const point = landmarks[index];
  if (!point) return { x: 0, y: 0 };
  return toPixel(point, width, height);
}

export function faceWidth(
  landmarks: FaceLandmarks,
  width: number,
  height: number,
) {
  const left = lm(landmarks, LM.leftCheek, width, height);
  const right = lm(landmarks, LM.rightCheek, width, height);
  return dist(left, right);
}

export function eyeCenter(
  landmarks: FaceLandmarks,
  width: number,
  height: number,
  side: "left" | "right",
) {
  if (side === "left") {
    return midpoint(
      lm(landmarks, LM.leftEyeOuter, width, height),
      lm(landmarks, LM.leftEyeInner, width, height),
    );
  }
  return midpoint(
    lm(landmarks, LM.rightEyeInner, width, height),
    lm(landmarks, LM.rightEyeOuter, width, height),
  );
}

export function faceAngle(
  landmarks: FaceLandmarks,
  width: number,
  height: number,
) {
  const templeA = lm(landmarks, LM.leftTemple, width, height);
  const templeB = lm(landmarks, LM.rightTemple, width, height);
  // Order by screen X so mirrored selfie landmarks don't flip rotation 180°.
  const [a, b] = templeA.x <= templeB.x ? [templeA, templeB] : [templeB, templeA];
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpPoint(
  a: { x: number; y: number },
  b: { x: number; y: number },
  t: number,
) {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

function lerpAngle(a: number, b: number, t: number) {
  let diff = b - a;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return a + diff * t;
}

/** Interpolate face pose — used per detection and per render frame. */
export function smoothFaceTransform(
  previous: FaceTransform | null,
  next: FaceTransform,
  alpha: number,
): FaceTransform {
  if (!previous) return next;
  const t = Math.min(1, Math.max(0, alpha));
  return {
    faceW: lerp(previous.faceW, next.faceW, t),
    faceH: lerp(previous.faceH, next.faceH, t),
    eyeSpan: lerp(previous.eyeSpan, next.eyeSpan, t),
    angle: lerpAngle(previous.angle, next.angle, t),
    forehead: lerpPoint(previous.forehead, next.forehead, t),
    chin: lerpPoint(previous.chin, next.chin, t),
    nose: lerpPoint(previous.nose, next.nose, t),
    leftEye: lerpPoint(previous.leftEye, next.leftEye, t),
    rightEye: lerpPoint(previous.rightEye, next.rightEye, t),
    eyeMid: lerpPoint(previous.eyeMid, next.eyeMid, t),
    mouth: lerpPoint(previous.mouth, next.mouth, t),
  };
}

export function mirrorLandmarks(landmarks: FaceLandmarks): FaceLandmarks {
  return landmarks.map((point) => ({ ...point, x: 1 - point.x }));
}

export function getFallbackFaceTransform(
  width: number,
  height: number,
): FaceTransform {
  const faceW = width * 0.48;
  const cx = width * 0.5;
  const cy = height * 0.44;

  const forehead = { x: cx, y: cy - faceW * 0.38 };
  const chin = { x: cx, y: cy + faceW * 0.42 };

  const leftEye = { x: cx - faceW * 0.22, y: cy - faceW * 0.06 };
  const rightEye = { x: cx + faceW * 0.22, y: cy - faceW * 0.06 };

  return {
    faceW,
    faceH: dist(forehead, chin),
    eyeSpan: dist(leftEye, rightEye),
    angle: 0,
    forehead,
    chin,
    nose: { x: cx, y: cy + faceW * 0.04 },
    leftEye,
    rightEye,
    eyeMid: midpoint(leftEye, rightEye),
    mouth: { x: cx, y: cy + faceW * 0.28 },
  };
}

export function getFaceTransform(
  landmarks: FaceLandmarks,
  width: number,
  height: number,
): FaceTransform {
  const leftEye = eyeCenter(landmarks, width, height, "left");
  const rightEye = eyeCenter(landmarks, width, height, "right");
  const mouth = midpoint(
    lm(landmarks, LM.mouthLeft, width, height),
    lm(landmarks, LM.mouthRight, width, height),
  );

  const forehead = lm(landmarks, LM.forehead, width, height);
  const chin = lm(landmarks, LM.chin, width, height);

  return {
    faceW: faceWidth(landmarks, width, height),
    faceH: dist(forehead, chin),
    eyeSpan: dist(leftEye, rightEye),
    angle: faceAngle(landmarks, width, height),
    forehead,
    chin,
    nose: lm(landmarks, LM.noseTip, width, height),
    leftEye,
    rightEye,
    eyeMid: midpoint(leftEye, rightEye),
    mouth,
  };
}
