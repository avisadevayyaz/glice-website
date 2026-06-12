import { lm, LM } from "../landmark-utils";
import type { ArRenderContext } from "../types";
import { drawEmoji, drawEmojiPair } from "./draw-utils";

const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379,
  378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
  162, 21, 54, 103, 67, 109,
];

function clipFaceOval(
  ctx: CanvasRenderingContext2D,
  landmarks: NonNullable<ArRenderContext["landmarks"]>,
  width: number,
  height: number,
) {
  const first = landmarks[FACE_OVAL[0]!];
  if (!first) return false;
  ctx.beginPath();
  ctx.moveTo(first.x * width, first.y * height);
  for (let i = 1; i < FACE_OVAL.length; i++) {
    const p = landmarks[FACE_OVAL[i]!];
    if (!p) continue;
    ctx.lineTo(p.x * width, p.y * height);
  }
  ctx.closePath();
  ctx.clip();
  return true;
}

export function drawBeauty({ ctx, width, height, landmarks, face }: ArRenderContext) {
  if (!landmarks || !face) return;
  ctx.save();
  if (clipFaceOval(ctx, landmarks, width, height)) {
    ctx.filter = "blur(1.2px) brightness(1.1) saturate(1.08)";
    ctx.fillStyle = "rgba(255, 230, 200, 0.25)";
    ctx.fillRect(0, 0, width, height);
    ctx.filter = "none";
  }
  ctx.restore();

  for (const eye of [face.leftEye, face.rightEye]) {
    const g = ctx.createRadialGradient(eye.x, eye.y, 0, eye.x, eye.y, face.faceW * 0.12);
    g.addColorStop(0, "rgba(255, 255, 255, 0.2)");
    g.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(eye.x, eye.y, face.faceW * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawSkiGoggles({ ctx, width, height, landmarks, face }: ArRenderContext) {
  if (!landmarks || !face) return;
  const fw = face.faceW;
  const left = face.leftEye;
  const right = face.rightEye;
  const bridge = lm(landmarks, LM.noseBridge, width, height);
  const angle = face.angle;
  const lensR = fw * 0.34;

  ctx.save();
  ctx.translate(bridge.x, bridge.y);
  ctx.rotate(angle);

  const lx = left.x - bridge.x;
  const ly = left.y - bridge.y;
  const rx = right.x - bridge.x;
  const ry = right.y - bridge.y;

  const drawLens = (cx: number, cy: number) => {
    ctx.beginPath();
    ctx.arc(cx, cy, lensR, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(cx - lensR * 0.2, cy - lensR * 0.2, 0, cx, cy, lensR);
    g.addColorStop(0, "rgba(56, 189, 248, 0.75)");
    g.addColorStop(0.6, "rgba(14, 116, 144, 0.88)");
    g.addColorStop(1, "rgba(8, 47, 73, 0.95)");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = fw * 0.025;
    ctx.strokeStyle = "#f97316";
    ctx.stroke();
  };

  drawLens(lx, ly);
  drawLens(rx, ry);

  ctx.beginPath();
  ctx.moveTo(lx + lensR * 0.85, ly);
  ctx.lineTo(rx - lensR * 0.85, ry);
  ctx.lineWidth = fw * 0.02;
  ctx.strokeStyle = "#f97316";
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(lx - lensR, ly);
  ctx.lineTo(lx - lensR - fw * 0.35, ly - fw * 0.05);
  ctx.moveTo(rx + lensR, ry);
  ctx.lineTo(rx + lensR + fw * 0.35, ry - fw * 0.05);
  ctx.strokeStyle = "#ea580c";
  ctx.lineWidth = fw * 0.018;
  ctx.stroke();

  ctx.restore();
}

export function drawFlowerCrown({ ctx, face }: ArRenderContext) {
  if (!face) return;
  const colors = ["#f472b6", "#fb7185", "#fda4af", "#f9a8d4", "#ec4899"];
  const count = 6;
  for (let i = 0; i < count; i++) {
    const t = (i / (count - 1) - 0.5) * 1.1;
    const x = face.forehead.x + t * face.faceW * 0.55;
    const y = face.forehead.y - face.faceW * (0.28 + Math.cos(i) * 0.04);
    const size = face.faceW * 0.11;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(face.angle + t * 0.35);
    for (let p = 0; p < 5; p++) {
      ctx.beginPath();
      ctx.rotate((Math.PI * 2) / 5);
      ctx.ellipse(0, size * 0.55, size * 0.35, size * 0.55, 0, 0, Math.PI * 2);
      ctx.fillStyle = colors[i % colors.length]!;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = "#fde047";
    ctx.fill();
    ctx.restore();
  }
}

export function drawVampire({ ctx, width, height, landmarks, face }: ArRenderContext) {
  if (!landmarks || !face) return;

  ctx.save();
  if (clipFaceOval(ctx, landmarks, width, height)) {
    ctx.fillStyle = "rgba(148, 163, 184, 0.12)";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();

  for (const eye of [face.leftEye, face.rightEye]) {
    ctx.beginPath();
    ctx.arc(eye.x, eye.y, face.faceW * 0.09, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(127, 29, 29, 0.55)";
    ctx.fill();
  }

  const mouth = face.mouth;
  ctx.save();
  ctx.translate(mouth.x, mouth.y);
  ctx.rotate(face.angle);
  ctx.fillStyle = "#fef2f2";
  ctx.beginPath();
  ctx.moveTo(-face.faceW * 0.04, face.faceW * 0.02);
  ctx.lineTo(-face.faceW * 0.025, face.faceW * 0.1);
  ctx.lineTo(-face.faceW * 0.01, face.faceW * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(face.faceW * 0.04, face.faceW * 0.02);
  ctx.lineTo(face.faceW * 0.025, face.faceW * 0.1);
  ctx.lineTo(face.faceW * 0.01, face.faceW * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawAlien({ ctx, width, height, landmarks, face }: ArRenderContext) {
  if (!landmarks || !face) return;

  ctx.save();
  if (clipFaceOval(ctx, landmarks, width, height)) {
    ctx.fillStyle = "rgba(74, 222, 128, 0.14)";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();

  for (const eye of [face.leftEye, face.rightEye]) {
    ctx.beginPath();
    ctx.ellipse(eye.x, eye.y, face.faceW * 0.14, face.faceW * 0.2, face.angle, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(20, 83, 45, 0.85)";
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(eye.x, eye.y - face.faceW * 0.03, face.faceW * 0.05, face.faceW * 0.08, face.angle, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fill();
  }
}

export function drawFireEyes({ ctx, face }: ArRenderContext) {
  if (!face) return;
  const drawFlame = (x: number, y: number, flip: number) => {
    ctx.save();
    ctx.translate(x, y - face.faceW * 0.12);
    ctx.rotate(face.angle + flip * 0.15);
    const h = face.faceW * 0.22;
    const g = ctx.createLinearGradient(0, h, 0, -h);
    g.addColorStop(0, "#f97316");
    g.addColorStop(0.5, "#facc15");
    g.addColorStop(1, "rgba(250, 204, 21, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.4);
    ctx.quadraticCurveTo(h * 0.5 * flip, -h * 0.2, 0, -h);
    ctx.quadraticCurveTo(-h * 0.35 * flip, -h * 0.15, 0, h * 0.4);
    ctx.fill();
    ctx.restore();
  };
  drawFlame(face.leftEye.x, face.leftEye.y, -1);
  drawFlame(face.rightEye.x, face.rightEye.y, 1);
}

export function drawBunnyMask({ ctx, face }: ArRenderContext) {
  if (!face) return;
  const drawEar = (x: number, flip: number) => {
    ctx.save();
    ctx.translate(x, face.forehead.y - face.faceW * 0.05);
    ctx.rotate(face.angle + flip * 0.3);
    ctx.fillStyle = "#f8fafc";
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = face.faceW * 0.012;
    ctx.beginPath();
    ctx.ellipse(0, -face.faceW * 0.22, face.faceW * 0.1, face.faceW * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fda4af";
    ctx.beginPath();
    ctx.ellipse(0, -face.faceW * 0.22, face.faceW * 0.05, face.faceW * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  drawEar(face.forehead.x - face.faceW * 0.22, -1);
  drawEar(face.forehead.x + face.faceW * 0.22, 1);
  ctx.beginPath();
  ctx.ellipse(face.nose.x, face.nose.y, face.faceW * 0.05, face.faceW * 0.04, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#fb7185";
  ctx.fill();
}

export function drawDogMask({ ctx, face }: ArRenderContext) {
  if (!face) return;
  const earY = face.forehead.y - face.faceW * 0.02;
  for (const [x, flip] of [
    [face.forehead.x - face.faceW * 0.3, -1],
    [face.forehead.x + face.faceW * 0.3, 1],
  ] as const) {
    ctx.save();
    ctx.translate(x, earY);
    ctx.rotate(face.angle + flip * 0.5);
    ctx.fillStyle = "#92400e";
    ctx.beginPath();
    ctx.ellipse(0, 0, face.faceW * 0.12, face.faceW * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.ellipse(face.nose.x, face.nose.y, face.faceW * 0.08, face.faceW * 0.06, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#1c1917";
  ctx.fill();
  drawEmoji(ctx, "👅", face.mouth.x, face.mouth.y + face.faceW * 0.06, face.faceW * 0.14, face.angle);
}

export function drawHeartsLens({ ctx, face }: ArRenderContext) {
  if (!face) return;
  drawEmojiPair(ctx, "❤️", face.leftEye, face.rightEye, face.faceW * 0.26, face.angle);
  drawEmoji(ctx, "💕", face.forehead.x, face.forehead.y - face.faceW * 0.35, face.faceW * 0.2, face.angle);
}

export function drawStarsLens({ ctx, face }: ArRenderContext) {
  if (!face) return;
  drawEmojiPair(ctx, "⭐", face.leftEye, face.rightEye, face.faceW * 0.24, face.angle);
}

export function drawCoolLens({ ctx, face }: ArRenderContext) {
  if (!face) return;
  drawEmoji(ctx, "😎", (face.leftEye.x + face.rightEye.x) / 2, (face.leftEye.y + face.rightEye.y) / 2, face.faceW * 0.42, face.angle);
}
