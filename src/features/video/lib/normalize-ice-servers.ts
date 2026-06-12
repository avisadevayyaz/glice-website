const CLOUDFLARE_STUN = "stun:stun.cloudflare.com:3478";

const CLOUDFLARE_TURN_URLS = [
  "turn:turn.cloudflare.com:3478?transport=udp",
  "turn:turn.cloudflare.com:3478?transport=tcp",
  "turns:turn.cloudflare.com:5349?transport=tcp",
] as const;

function urlString(urls: RTCIceServer["urls"]): string {
  if (Array.isArray(urls)) return urls.join(" ");
  return String(urls);
}

function isCloudflareIce(urls: RTCIceServer["urls"]): boolean {
  return urlString(urls).includes("cloudflare.com");
}

/** Expand a single Cloudflare TURN entry into STUN + multi-transport TURN (matches CF docs). */
function expandCloudflareEntry(
  username?: string,
  credential?: string,
): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: CLOUDFLARE_STUN }];

  if (username && credential) {
    servers.push({
      urls: [...CLOUDFLARE_TURN_URLS],
      username,
      credential,
    });
  }

  return servers;
}

/**
 * Normalize API ICE payload for WebRTC.
 * API uses `url` (singular); RTCPeerConnection expects `urls`.
 * Cloudflare TURN credentials are short-lived — always fetch fresh before calls.
 */
export function normalizeIceServers(raw: unknown): RTCIceServer[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [{ urls: CLOUDFLARE_STUN }];
  }

  const servers: RTCIceServer[] = [];
  let sawCloudflare = false;

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;

    const urls =
      row.urls ??
      row.url ??
      (Array.isArray(row.urls) ? row.urls : undefined);

    if (!urls) continue;

    const username =
      typeof row.username === "string" ? row.username : undefined;
    const credential =
      typeof row.credential === "string" ? row.credential : undefined;

    if (isCloudflareIce(urls as RTCIceServer["urls"])) {
      sawCloudflare = true;
      servers.push(...expandCloudflareEntry(username, credential));
      continue;
    }

    const server: RTCIceServer = {
      urls: urls as RTCIceServer["urls"],
    };
    if (username) server.username = username;
    if (credential) server.credential = credential;
    servers.push(server);
  }

  if (servers.length === 0) {
    return [{ urls: CLOUDFLARE_STUN }];
  }

  if (!sawCloudflare) {
    const hasStun = servers.some((s) => urlString(s.urls).includes("stun:"));
    if (!hasStun) {
      servers.unshift({ urls: CLOUDFLARE_STUN });
    }
  }

  return dedupeIceServers(servers);
}

function dedupeIceServers(servers: RTCIceServer[]): RTCIceServer[] {
  const out: RTCIceServer[] = [];
  const keys = new Set<string>();

  for (const server of servers) {
    const key = `${urlString(server.urls)}|${server.username ?? ""}`;
    if (keys.has(key)) continue;
    keys.add(key);
    out.push(server);
  }

  return out;
}
