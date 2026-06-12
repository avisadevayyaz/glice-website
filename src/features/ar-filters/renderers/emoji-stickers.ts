import { lm, LM } from "../landmark-utils";
import type { ArRenderContext } from "../types";
import { drawEmoji, drawEmojiPair } from "./draw-utils";

export function drawEmojiCool({ ctx, face }: ArRenderContext) {
  if (!face) return;
  const size = face.faceW * 0.38;
  const center = {
    x: (face.leftEye.x + face.rightEye.x) / 2,
    y: (face.leftEye.y + face.rightEye.y) / 2,
  };
  drawEmoji(ctx, "😎", center.x, center.y, size, face.angle);
}

export function drawEmojiHearts({ ctx, face }: ArRenderContext) {
  if (!face) return;
  const size = face.faceW * 0.28;
  drawEmojiPair(ctx, "❤️", face.leftEye, face.rightEye, size, face.angle);
}

export function drawEmojiStar({ ctx, face }: ArRenderContext) {
  if (!face) return;
  const size = face.faceW * 0.26;
  drawEmojiPair(ctx, "⭐", face.leftEye, face.rightEye, size, face.angle);
}

export function drawEmojiParty({ ctx, face }: ArRenderContext) {
  if (!face) return;
  const size = face.faceW * 0.55;
  drawEmoji(
    ctx,
    "🥳",
    face.forehead.x,
    face.forehead.y - face.faceW * 0.42,
    size,
    face.angle,
  );
}

export function drawEmojiCrown({ ctx, face }: ArRenderContext) {
  if (!face) return;
  const size = face.faceW * 0.5;
  drawEmoji(
    ctx,
    "👑",
    face.forehead.x,
    face.forehead.y - face.faceW * 0.38,
    size,
    face.angle,
  );
}

export function drawEmojiDevil({ ctx, face }: ArRenderContext) {
  if (!face) return;
  const hornY = face.forehead.y - face.faceW * 0.22;
  const spread = face.faceW * 0.26;
  const hornH = face.faceW * 0.28;

  ctx.save();
  ctx.translate(face.forehead.x, hornY);
  ctx.rotate(face.angle);

  const drawHorn = (flip: number) => {
    ctx.beginPath();
    ctx.moveTo(flip * spread * 0.35, 0);
    ctx.quadraticCurveTo(flip * spread * 0.9, -hornH * 0.35, flip * spread * 0.55, -hornH);
    ctx.quadraticCurveTo(flip * spread * 0.25, -hornH * 0.55, flip * spread * 0.35, 0);
    ctx.fillStyle = "#7f1d1d";
    ctx.fill();
    ctx.strokeStyle = "#450a0a";
    ctx.lineWidth = Math.max(1.5, face.faceW * 0.008);
    ctx.stroke();
  };

  drawHorn(-1);
  drawHorn(1);
  ctx.restore();

  drawEmoji(
    ctx,
    "😈",
    face.forehead.x,
    face.forehead.y - face.faceW * 0.05,
    face.faceW * 0.32,
    face.angle,
  );
}

export function drawEmojiClown({ ctx, face, landmarks }: ArRenderContext) {
  if (!face || !landmarks) return;
  const noseSize = face.faceW * 0.2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(face.nose.x, face.nose.y, noseSize * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = "#ef4444";
  ctx.fill();
  ctx.strokeStyle = "#b91c1c";
  ctx.lineWidth = Math.max(2, face.faceW * 0.012);
  ctx.stroke();
  ctx.restore();

  drawEmoji(
    ctx,
    "🤡",
    face.forehead.x,
    face.forehead.y - face.faceW * 0.05,
    face.faceW * 0.35,
    face.angle,
  );
}

export function drawEmojiDog({ ctx, face }: ArRenderContext) {
  if (!face) return;
  const earY = face.forehead.y - face.faceW * 0.08;

  ctx.save();
  ctx.translate(face.forehead.x, earY);
  ctx.rotate(face.angle);

  const drawEar = (flip: number) => {
    ctx.beginPath();
    ctx.ellipse(
      flip * face.faceW * 0.34,
      -face.faceW * 0.12,
      face.faceW * 0.14,
      face.faceW * 0.22,
      flip * 0.35,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = "#92400e";
    ctx.fill();
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = Math.max(1.5, face.faceW * 0.008);
    ctx.stroke();
  };

  drawEar(-1);
  drawEar(1);
  ctx.restore();

  drawEmoji(ctx, "🐽", face.nose.x, face.nose.y, face.faceW * 0.24, face.angle);
  drawEmoji(
    ctx,
    "🐶",
    face.forehead.x,
    face.forehead.y - face.faceW * 0.45,
    face.faceW * 0.22,
    face.angle,
  );
}

export function drawEmojiCat({ ctx, face, landmarks }: ArRenderContext) {
  if (!face || !landmarks) return;
  const earSize = face.faceW * 0.3;
  const earY = face.forehead.y - face.faceW * 0.12;

  ctx.save();
  ctx.translate(face.forehead.x, earY);
  ctx.rotate(face.angle);

  const drawEar = (flip: number) => {
    ctx.beginPath();
    ctx.moveTo(flip * face.faceW * 0.22, 0);
    ctx.lineTo(flip * face.faceW * 0.38, -earSize * 0.9);
    ctx.lineTo(flip * face.faceW * 0.08, -earSize * 0.2);
    ctx.closePath();
    ctx.fillStyle = "#1e293b";
    ctx.fill();
    ctx.strokeStyle = "#32E6A1";
    ctx.lineWidth = Math.max(2, face.faceW * 0.01);
    ctx.stroke();
  };

  drawEar(-1);
  drawEar(1);
  ctx.restore();

  drawEmoji(ctx, "🐱", face.nose.x, face.nose.y, face.faceW * 0.18, face.angle);

  const mouthL = lm(landmarks, LM.mouthLeft, ctx.canvas.width, ctx.canvas.height);
  const mouthR = lm(landmarks, LM.mouthRight, ctx.canvas.width, ctx.canvas.height);
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = Math.max(1.5, face.faceW * 0.008);
  const whiskers = [
    [mouthL.x, mouthL.y, mouthL.x - face.faceW * 0.22, mouthL.y - face.faceW * 0.04],
    [mouthL.x, mouthL.y + face.faceW * 0.03, mouthL.x - face.faceW * 0.2, mouthL.y + face.faceW * 0.05],
    [mouthR.x, mouthR.y, mouthR.x + face.faceW * 0.22, mouthR.y - face.faceW * 0.04],
    [mouthR.x, mouthR.y + face.faceW * 0.03, mouthR.x + face.faceW * 0.2, mouthR.y + face.faceW * 0.05],
  ];
  for (const [x1, y1, x2, y2] of whiskers) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();
}
