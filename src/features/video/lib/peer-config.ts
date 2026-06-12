import type { PeerJSOption } from "peerjs";

/** PeerJS options — cloud by default (matches Flutter webview). Override with NEXT_PUBLIC_PEER_HOST. */
export function buildPeerOptions(
  iceServers: RTCIceServer[],
): PeerJSOption {
  const explicit = process.env.NEXT_PUBLIC_PEER_HOST?.trim();
  if (explicit) {
    const base = explicit.includes("://") ? explicit : `https://${explicit}`;
    const parsed = new URL(base);
    const secure = parsed.protocol === "https:";
    const port = parsed.port
      ? Number(parsed.port)
      : secure
        ? 443
        : 80;
    return {
      host: parsed.hostname,
      port,
      path: parsed.pathname === "/" ? "/" : parsed.pathname || "/",
      secure,
      config: { iceServers },
    };
  }

  return {
    host: "0.peerjs.com",
    port: 443,
    path: "/",
    secure: true,
    config: {
      iceServers,
    } as RTCConfiguration,
  };
}
