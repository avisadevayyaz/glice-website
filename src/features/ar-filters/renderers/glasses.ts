import type { ArRenderContext, FaceTransform } from "../types";

function drawLensPair(
  ctx: CanvasRenderingContext2D,
  face: FaceTransform,
  style: "aviator" | "round" | "pixel",
) {
  const left = face.leftEye;
  const right = face.rightEye;
  const bridge = {
    x: (left.x + right.x) / 2,
    y: (left.y + right.y) / 2 - face.faceW * 0.02,
  };
  const eyeDist = Math.hypot(right.x - left.x, right.y - left.y);
  const lensW = eyeDist * 0.62;
  const lensH = style === "round" ? lensW * 0.88 : lensW * 0.54;
  const angle = face.angle;
  const frameW = Math.max(3, eyeDist * 0.05);

  ctx.save();
  ctx.translate(bridge.x, bridge.y);
  ctx.rotate(angle);

  const leftLocal = { x: left.x - bridge.x, y: left.y - bridge.y };
  const rightLocal = { x: right.x - bridge.x, y: right.y - bridge.y };

  const drawLens = (cx: number, cy: number) => {
    ctx.beginPath();
    if (style === "round") {
      ctx.arc(cx, cy, lensW * 0.5, 0, Math.PI * 2);
    } else if (style === "pixel") {
      const s = lensW * 0.92;
      ctx.rect(cx - s / 2, cy - s * 0.42, s, s * 0.84);
    } else {
      ctx.ellipse(cx, cy, lensW * 0.5, lensH, 0, 0, Math.PI * 2);
    }

    if (style === "pixel") {
      ctx.fillStyle = "#111827";
      ctx.fill();
      ctx.strokeStyle = "#32E6A1";
      ctx.lineWidth = frameW;
      ctx.stroke();
    } else {
      const grad = ctx.createLinearGradient(cx - lensW * 0.3, cy, cx + lensW * 0.3, cy);
      grad.addColorStop(0, "rgba(5, 8, 20, 0.94)");
      grad.addColorStop(0.5, "rgba(20, 30, 55, 0.88)");
      grad.addColorStop(1, "rgba(5, 8, 20, 0.94)");
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = style === "round" ? "#c4b5fd" : "#1f2937";
      ctx.lineWidth = frameW;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(
        cx - lensW * 0.12,
        cy - lensH * 0.35,
        lensW * 0.22,
        lensH * 0.28,
        -0.35,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
      ctx.fill();
    }
  };

  drawLens(leftLocal.x, leftLocal.y);
  drawLens(rightLocal.x, rightLocal.y);

  ctx.beginPath();
  ctx.moveTo(leftLocal.x + lensW * 0.48, leftLocal.y);
  ctx.lineTo(rightLocal.x - lensW * 0.48, rightLocal.y);
  ctx.strokeStyle = style === "round" ? "#c4b5fd" : "#1f2937";
  ctx.lineWidth = frameW;
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.restore();
}

export function drawAviatorShades({ ctx, face }: ArRenderContext) {
  if (!face) return;
  drawLensPair(ctx, face, "aviator");
}

export function drawRoundGlasses({ ctx, face }: ArRenderContext) {
  if (!face) return;
  drawLensPair(ctx, face, "round");
}

export function drawPixelGlasses({ ctx, face }: ArRenderContext) {
  if (!face) return;
  drawLensPair(ctx, face, "pixel");
}
