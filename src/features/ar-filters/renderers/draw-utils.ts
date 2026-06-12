const EMOJI_FONT =
  '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

export function drawEmoji(
  ctx: CanvasRenderingContext2D,
  emoji: string,
  x: number,
  y: number,
  sizePx: number,
  angle = 0,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.font = `${sizePx}px ${EMOJI_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, 0, 0);
  ctx.restore();
}

export function drawEmojiPair(
  ctx: CanvasRenderingContext2D,
  emoji: string,
  left: { x: number; y: number },
  right: { x: number; y: number },
  sizePx: number,
  angle: number,
) {
  drawEmoji(ctx, emoji, left.x, left.y, sizePx, angle);
  drawEmoji(ctx, emoji, right.x, right.y, sizePx, angle);
}
