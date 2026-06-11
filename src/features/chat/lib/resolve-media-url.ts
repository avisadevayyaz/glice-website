const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

/** Strip JSON quotes / whitespace from API URL strings. */
export function normalizeMediaUrlString(value?: string | null): string {
  if (!value) return "";
  let trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    trimmed.startsWith('"') &&
    trimmed.endsWith('"')
  ) {
    try {
      const decoded = JSON.parse(trimmed) as unknown;
      if (typeof decoded === "string") return decoded.trim();
    } catch {
      trimmed = trimmed.slice(1, -1).trim();
    }
  }
  return trimmed;
}

export function resolveMediaUrl(url?: string | null): string {
  const trimmed = normalizeMediaUrlString(url);
  if (!trimmed) return "";
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  if (
    /^[\w-]+\.[\w.-]+\//.test(trimmed) ||
    trimmed.includes("amazonaws.com") ||
    trimmed.includes("cloudfront.net") ||
    trimmed.includes("glicelabs.com")
  ) {
    return `https://${trimmed.replace(/^\/+/, "")}`;
  }
  if (!API_BASE) return trimmed;
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${API_BASE}${path}`;
}

function isSameOrigin(url: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URL(url).origin === window.location.origin;
  } catch {
    return false;
  }
}

/** Same-origin proxy — fallback when direct CDN img load fails. */
export function toProxiedMediaUrl(url: string): string {
  if (
    !url ||
    url.startsWith("blob:") ||
    url.startsWith("data:") ||
    isSameOrigin(url)
  ) {
    return url;
  }
  if (typeof window === "undefined") return url;
  return `/api/chat-media?u=${encodeURIComponent(url)}`;
}

/**
 * Flutter CacheImage uses the network URL directly on <img> — no proxy.
 * Browsers load cross-origin images without CORS for display.
 */
export function resolveDisplayMediaUrl(url?: string | null): string {
  return resolveMediaUrl(url);
}

/** Direct URL first, proxied fallback — used by ChatImage on load error. */
export function mediaDisplayCandidates(url?: string | null): string[] {
  const resolved = resolveMediaUrl(url);
  if (!resolved) return [];

  const seen = new Set<string>();
  const out: string[] = [];
  const add = (candidate: string) => {
    if (!candidate || seen.has(candidate)) return;
    seen.add(candidate);
    out.push(candidate);
  };

  add(resolved);
  if (
    !resolved.startsWith("blob:") &&
    !resolved.startsWith("data:") &&
    typeof window !== "undefined"
  ) {
    add(toProxiedMediaUrl(resolved));
  }
  return out;
}
