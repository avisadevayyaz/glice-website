import {
  AR_FILTER_MANIFEST,
  getAllFilterAssetSrcs,
  type ArFilterManifestEntry,
} from "../filter-manifest";

type CachedAsset = HTMLImageElement | HTMLCanvasElement;

const cache = new Map<string, CachedAsset>();
const pending = new Map<string, Promise<CachedAsset>>();

function stripBlackBackground(
  image: HTMLImageElement,
  threshold = 28,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.drawImage(image, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    if (r <= threshold && g <= threshold && b <= threshold) {
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(new ImageData(data, width, height), 0, 0);
  return canvas;
}

function cacheKey(entry: Pick<ArFilterManifestEntry, "src" | "chromaKey">) {
  return entry.chromaKey ? `${entry.src}#chroma` : entry.src;
}

export function loadFilterAsset(entry: ArFilterManifestEntry): Promise<CachedAsset> {
  const key = cacheKey(entry);
  const cached = cache.get(key);
  if (cached) return Promise.resolve(cached);

  const inflight = pending.get(key);
  if (inflight) return inflight;

  const promise = new Promise<CachedAsset>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      const asset = entry.chromaKey ? stripBlackBackground(img) : img;
      cache.set(key, asset);
      pending.delete(key);
      resolve(asset);
    };
    img.onerror = () => {
      pending.delete(key);
      reject(new Error(`Failed to load filter asset: ${entry.src}`));
    };
    img.src = entry.src;
  });

  pending.set(key, promise);
  return promise;
}

export function getCachedFilterAsset(
  entry: ArFilterManifestEntry,
): CachedAsset | null {
  return cache.get(cacheKey(entry)) ?? null;
}

export async function preloadAllFilterAssets(): Promise<void> {
  await Promise.allSettled(AR_FILTER_MANIFEST.map((entry) => loadFilterAsset(entry)));
}

/** @deprecated Use preloadAllFilterAssets */
export async function preloadAllOverlays(): Promise<void> {
  await preloadAllFilterAssets();
}

export function getCachedOverlayImage(src: string): CachedAsset | null {
  return cache.get(src) ?? cache.get(`${src}#chroma`) ?? null;
}

export async function loadOverlayImage(src: string): Promise<CachedAsset> {
  const entry = AR_FILTER_MANIFEST.find((f) => f.src === src);
  if (entry) return loadFilterAsset(entry);

  const cached = cache.get(src);
  if (cached) return cached;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      cache.set(src, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Failed to load overlay: ${src}`));
    img.src = src;
  });
}

export function getAllOverlaySrcs(): string[] {
  return getAllFilterAssetSrcs();
}
