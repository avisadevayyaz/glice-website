import type { ArFilterManifestEntry } from "../filter-manifest";
import type { FaceTransform } from "../types";

type DrawableSource = CanvasImageSource & {
  width: number;
  height: number;
};

function sourceSize(source: DrawableSource) {
  if (source instanceof HTMLImageElement) {
    return {
      width: source.naturalWidth || source.width,
      height: source.naturalHeight || source.height,
    };
  }
  return { width: source.width, height: source.height };
}

export function drawPngOverlay(
  ctx: CanvasRenderingContext2D,
  face: FaceTransform,
  image: DrawableSource,
  spec: ArFilterManifestEntry,
) {
  const { width: naturalW, height: naturalH } = sourceSize(image);
  if (!naturalW || !naturalH) return;

  const aspect = naturalW / naturalH;
  const ox = (spec.offsetX ?? 0) * face.faceW;
  const oy = (spec.offsetY ?? 0) * face.faceW;

  let x: number;
  let y: number;
  let w: number;
  let h: number;
  let anchorY: number;

  switch (spec.anchor) {
    case "eyes": {
      const eyeLine = spec.eyeLineRatio ?? 0.46;
      w = face.eyeSpan * (spec.widthScale ?? 2.5);
      h = w / aspect;
      x = face.eyeMid.x + ox;
      y = face.eyeMid.y + oy;
      anchorY = -h * eyeLine;
      break;
    }
    case "forehead":
      w = face.faceW * (spec.widthScale ?? 1.4);
      h = w / aspect;
      x = face.forehead.x + ox;
      y = face.forehead.y + oy;
      anchorY = -h * (spec.anchorYRatio ?? 0.88);
      break;
    case "mouth":
      w = face.faceW * (spec.widthScale ?? 1.2);
      h = w / aspect;
      x = face.mouth.x + ox;
      y = face.mouth.y + oy;
      anchorY = -h * 0.35;
      break;
    case "face-center": {
      const eyeLine = spec.eyeLineRatio ?? 0.34;
      h = face.faceH * (spec.heightScale ?? 1.32);
      w = h * aspect;
      x = face.eyeMid.x + ox;
      y = face.eyeMid.y + oy;
      anchorY = -h * eyeLine;
      break;
    }
    default:
      return;
  }

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.translate(x, y);
  ctx.rotate(face.angle);
  ctx.drawImage(image, -w / 2, anchorY, w, h);
  ctx.restore();
}
