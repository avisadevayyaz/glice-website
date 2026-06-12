import { AR_FILTER_MANIFEST } from "./filter-manifest";
import type { ArFilterDefinition, ArFilterId } from "./types";

export const AR_FILTER_CATALOG: ArFilterDefinition[] = [
  { id: "none", label: "Normal" },
  ...AR_FILTER_MANIFEST.map((entry) => ({
    id: entry.id,
    label: entry.label,
    previewSrc: entry.src,
  })),
];

const VALID_IDS = new Set<ArFilterId>(AR_FILTER_CATALOG.map((f) => f.id));

const LEGACY_IDS: Record<string, ArFilterId> = {
  beauty: "none",
  shades: "hearts-glasses",
  ski: "none",
  round: "none",
  pixel: "none",
  cool: "none",
  hearts: "hearts-glasses",
  stars: "none",
  flower: "none",
  bunny: "none",
  dog: "none",
  cat: "none",
  devil: "none",
  vampire: "none",
  alien: "none",
  clown: "none",
  party: "none",
  crown: "princess",
  fire: "none",
  "round-glasses": "none",
  "pixel-glasses": "none",
  "emoji-cool": "none",
  "emoji-hearts": "hearts-glasses",
  "emoji-star": "none",
  "emoji-party": "none",
  "emoji-crown": "princess",
  "emoji-devil": "none",
  "emoji-clown": "none",
  "emoji-dog": "none",
  "emoji-cat": "none",
};

export function getFilterDefinition(id: string): ArFilterDefinition {
  const normalized = sanitizeFilterId(id);
  return AR_FILTER_CATALOG.find((f) => f.id === normalized) ?? AR_FILTER_CATALOG[0]!;
}

export function sanitizeFilterId(id: string): ArFilterId {
  if (VALID_IDS.has(id as ArFilterId)) return id as ArFilterId;
  return LEGACY_IDS[id] ?? "none";
}
