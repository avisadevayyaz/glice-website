import { getCachedFilterAsset } from "../assets/asset-loader";
import { getManifestEntry } from "../filter-manifest";
import type { ArFilterId, ArRenderContext } from "../types";
import { drawPngOverlay } from "./png-overlay";

export function drawBaseFrame(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  mirror: boolean,
) {
  ctx.save();
  if (mirror) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, 0, 0, width, height);
  ctx.restore();
}

export function applyArOverlay(filterId: ArFilterId, render: ArRenderContext) {
  if (filterId === "none" || !render.face) return;

  const entry = getManifestEntry(filterId);
  if (!entry) return;

  const asset = getCachedFilterAsset(entry);
  if (!asset) return;

  drawPngOverlay(render.ctx, render.face, asset, entry);
}
