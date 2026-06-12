export type ArFilterId =
  | "none"
  | "hearts-glasses"
  | "wizard"
  | "princess"
  | "derp"
  | "troll"
  | "itachi"
  | "redface";

export type ArFilterDefinition = {
  id: ArFilterId;
  label: string;
  previewSrc?: string;
};

export type FaceLandmarks = {
  x: number;
  y: number;
  z?: number;
}[];

export type FacePoint = { x: number; y: number };

export type FaceTransform = {
  faceW: number;
  faceH: number;
  eyeSpan: number;
  angle: number;
  forehead: FacePoint;
  chin: FacePoint;
  nose: FacePoint;
  leftEye: FacePoint;
  rightEye: FacePoint;
  eyeMid: FacePoint;
  mouth: FacePoint;
};

export type ArRenderContext = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  landmarks: FaceLandmarks | null;
  face: FaceTransform | null;
  mirror: boolean;
};
