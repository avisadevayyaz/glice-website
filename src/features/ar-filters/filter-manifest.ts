import type { ArFilterId } from "./types";

export type OverlayAnchor = "eyes" | "forehead" | "mouth" | "face-center";

export type ArFilterManifestEntry = {
  id: ArFilterId;
  label: string;
  src: string;
  anchor: OverlayAnchor;
  widthScale?: number;
  heightScale?: number;
  offsetX?: number;
  offsetY?: number;
  /** Vertical draw anchor as fraction of image height (0 = top, 1 = bottom). */
  anchorYRatio?: number;
  /** For face masks: where the eye line sits on the PNG (0 = top, 1 = bottom). */
  eyeLineRatio?: number;
  /** Strip near-black pixels on load (for meme assets with solid backgrounds). */
  chromaKey?: boolean;
};

const IMAGE_BASE = "/ar-filters/images";

/** Single source of truth for AR lenses — add PNGs to public/ar-filters/images/ and register here. */
export const AR_FILTER_MANIFEST: ArFilterManifestEntry[] = [
  {
    id: "hearts-glasses",
    label: "Love",
    src: `${IMAGE_BASE}/hearts-glasses.png`,
    anchor: "eyes",
    widthScale: 2.65,
    offsetY: 0.01,
    eyeLineRatio: 0.48,
  },
  {
    id: "wizard",
    label: "Wizard",
    src: `${IMAGE_BASE}/wizard-hat.png`,
    anchor: "forehead",
    widthScale: 1.48,
    offsetY: -0.08,
    anchorYRatio: 0.9,
    chromaKey: true,
  },
  {
    id: "princess",
    label: "Princess",
    src: `${IMAGE_BASE}/princess.png`,
    anchor: "face-center",
    heightScale: 1.38,
    eyeLineRatio: 0.28,
    offsetY: -0.02,
    chromaKey: true,
  },
  {
    id: "derp",
    label: "Derp",
    src: `${IMAGE_BASE}/derp.png`,
    anchor: "face-center",
    heightScale: 1.34,
    eyeLineRatio: 0.3,
    offsetY: 0.01,
    chromaKey: true,
  },
  {
    id: "troll",
    label: "Troll",
    src: `${IMAGE_BASE}/troll.png`,
    anchor: "face-center",
    heightScale: 1.3,
    eyeLineRatio: 0.36,
    offsetY: 0.02,
    chromaKey: true,
  },
  {
    id: "itachi",
    label: "Itachi",
    src: `${IMAGE_BASE}/itachi.png`,
    anchor: "face-center",
    heightScale: 1.36,
    eyeLineRatio: 0.33,
    offsetY: 0.01,
    chromaKey: true,
  },
  {
    id: "redface",
    label: "redface",
    src: `${IMAGE_BASE}/redface.png`,
    anchor: "face-center",
    heightScale: 1.36,
    eyeLineRatio: 0.33,
    offsetY: 0.01,
    chromaKey: true,
  },
];

export const AR_FILTER_IDS: ArFilterId[] = [
  "none",
  ...AR_FILTER_MANIFEST.map((f) => f.id),
];

export function getManifestEntry(id: ArFilterId): ArFilterManifestEntry | null {
  if (id === "none") return null;
  return AR_FILTER_MANIFEST.find((f) => f.id === id) ?? null;
}

export function getAllFilterAssetSrcs(): string[] {
  return [...new Set(AR_FILTER_MANIFEST.map((f) => f.src))];
}
