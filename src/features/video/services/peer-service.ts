import Peer, { type MediaConnection } from "peerjs";
import { buildPeerOptions } from "../lib/peer-config";

type PeerCallbacks = {
  onRemoteStream: (stream: MediaStream) => void;
  onRemoteDisconnected: () => void;
  onPeerOpen: () => void;
  onError: (message: string) => void;
};

const DIAL_RETRY_MS = 500;
const DIAL_WINDOW_MS = 45_000;
const OPEN_TIMEOUT_MS = 45_000;

/**
 * WebRTC peer layer — mirrors Flutter assets/webview/js/peer.js + call.js.
 */
export class PeerService {
  private peer: Peer | null = null;
  private activeCalls: MediaConnection[] = [];
  private remoteStreamCall: MediaConnection | null = null;
  private remoteConnected = false;
  private callbacks: PeerCallbacks | null = null;
  private localStream: MediaStream | null = null;
  private peerUserId: string | null = null;
  private iceServers: RTCIceServer[] = [];
  private peerOpen = false;
  private pendingRoomId: string | null = null;
  private openPromise: Promise<void> | null = null;
  private dialTargets: string[] = [];
  private dialTargetIndex = 0;
  private dialTimer: number | null = null;
  private dialStartedAt = 0;
  private lastOutboundAt = 0;
  private unavailableStreak = 0;

  setLocalStream(stream: MediaStream | null) {
    this.localStream = stream;
  }

  /** Swap outgoing video mid-call when AR filter or camera pipeline changes. */
  replaceLocalVideoTrack(stream: MediaStream | null) {
    if (!stream) return;
    this.localStream = stream;
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    for (const call of this.activeCalls) {
      const pc = (call as MediaConnection & { peerConnection?: RTCPeerConnection })
        .peerConnection;
      if (!pc) continue;
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      void sender?.replaceTrack(videoTrack);
    }
  }

  setCallbacks(callbacks: PeerCallbacks | null) {
    this.callbacks = callbacks;
  }

  hasPeer(): boolean {
    return this.peer !== null;
  }

  isReady(): boolean {
    return Boolean(this.peer && this.peerOpen);
  }

  /**
   * Flutter init(userId, iceServersJson, roomIdOptional).
   * Reuses peer when it exists; creates peer when null (after diconnectPeer).
   * @param dialPrimary Partner user id (PeerJS peer id) — preferred dial target.
   * @param dialFallback Optional secondary id (never `room_*` chat ids).
   */
  init(
    userId: string,
    iceServers: RTCIceServer[],
    dialPrimary?: string | null,
    dialFallback?: string | null,
  ): Promise<void> {
    const id = userId.trim();
    const targets = this.resolveDialTargets(id, dialPrimary, dialFallback);

    this.peerUserId = id;
    this.iceServers = iceServers;
    this.unavailableStreak = 0;

    if (this.peer) {
      if (targets.length > 0) {
        this.queueDial(targets);
        if (this.peerOpen) {
          this.beginDialLoop();
        } else {
          try {
            this.peer.reconnect();
          } catch {
            /* ignore */
          }
        }
      }
      return this.peerOpen
        ? Promise.resolve()
        : (this.openPromise ?? Promise.resolve());
    }

    if (targets.length > 0) {
      this.queueDial(targets);
    }

    this.openPromise = this.createPeer(id, iceServers).catch((err) => {
      this.openPromise = null;
      this.disconnect();
      throw err;
    });
    return this.openPromise;
  }

  private resolveDialTargets(
    myId: string,
    primary?: string | null,
    fallback?: string | null,
  ): string[] {
    const out: string[] = [];
    const add = (value?: string | null) => {
      const id = value?.trim();
      if (!id || id === myId) return;
      // Chat room ids (room_userA_userB) are not PeerJS peer ids.
      if (id.startsWith("room_")) return;
      if (!out.includes(id)) out.push(id);
    };
    add(primary);
    add(fallback);
    return out;
  }

  private queueDial(targets: string[]) {
    this.dialTargets = targets;
    this.dialTargetIndex = 0;
    this.unavailableStreak = 0;
    this.pendingRoomId = targets[0] ?? null;
  }

  private currentDialTarget(): string | null {
    return this.dialTargets[this.dialTargetIndex] ?? null;
  }

  /** Wait until peer is registered (Flutter onPeerConnected). */
  waitUntilOpen(): Promise<void> {
    if (this.peerOpen) return Promise.resolve();
    if (this.openPromise) return this.openPromise;
    return Promise.reject(new Error("Peer not initialized"));
  }

  private createPeer(userId: string, iceServers: RTCIceServer[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.peerOpen = false;
      const options = buildPeerOptions(iceServers);

      console.log("[Peer] init userId:", userId, "targets:", this.dialTargets);

      this.peer = new Peer(userId, options);

      const fail = (err: Error) => {
        clearTimeout(openTimer);
        reject(err);
      };

      const openTimer = window.setTimeout(() => {
        if (!this.peerOpen) {
          fail(new Error("Peer connection timeout"));
        }
      }, OPEN_TIMEOUT_MS);

      this.peer.on("open", () => {
        clearTimeout(openTimer);
        this.peerOpen = true;
        console.log("[Peer] Open as", this.peer?.id);
        this.callbacks?.onPeerOpen();
        this.pendingRoomId = null;
        this.beginDialLoop();
        resolve();
      });

      this.peer.on("disconnected", () => {
        console.warn("[Peer] Lost connection to server — reconnecting");
        this.peerOpen = false;
        try {
          this.peer?.reconnect();
        } catch {
          /* ignore */
        }
      });

      this.peer.on("error", (err) => {
        const msg = (err && (err.message || err.type || String(err))) || "";
        const errType = (err && err.type ? err.type : "").toLowerCase();

        if (/already exists|duplicate|taken/i.test(msg)) {
          console.log("[Peer] Ignoring duplicate-connection error (expected when both call)");
          return;
        }

        if (
          /could not connect to peer|peer-unavailable|unavailable/i.test(msg) ||
          errType === "peer-unavailable"
        ) {
          if (this.dialTargets.length > 0 && !this.remoteConnected) {
            this.unavailableStreak += 1;
            if (
              this.unavailableStreak >= 6 &&
              this.dialTargetIndex < this.dialTargets.length - 1
            ) {
              this.dialTargetIndex += 1;
              this.unavailableStreak = 0;
              this.activeCalls.forEach((call) => {
                try {
                  call.close();
                } catch {
                  /* ignore */
                }
              });
              this.activeCalls = [];
              console.log(
                "[Peer] Switching dial target →",
                this.currentDialTarget(),
              );
            } else {
              console.log("[Peer] Remote not ready yet — retrying dial:", msg);
            }
            return;
          }
        }

        const isNonFatal =
          /^(error|webrtc|network)$/i.test(msg.trim()) ||
          /^(webrtc|network)$/i.test(errType);

        if (isNonFatal && (this.activeCalls.length >= 1 || this.remoteConnected)) {
          return;
        }

        console.warn("[Peer] Error:", msg);
        this.callbacks?.onError(msg);
      });

      this.peer.on("call", (call) => {
        console.log("[Peer] Incoming call from", call.peer);
        this.stopDialLoop();
        const stream = this.localStream;
        if (!stream) return;
        call.answer(stream);
        this.setupCall(call);
      });
    });
  }

  startCall(otherUserId: string) {
    this.queueDial([otherUserId]);
    this.beginDialLoop();
  }

  private beginDialLoop() {
    this.stopDialLoop();
    if (this.dialTargets.length === 0) return;
    if (this.remoteConnected) return;

    this.dialStartedAt = Date.now();
    console.log("[Peer] Dial loop →", this.dialTargets.join(", "));
    this.dialLoop();
  }

  private dialLoop() {
    if (this.remoteConnected || this.dialTargets.length === 0) {
      this.stopDialLoop();
      return;
    }

    if (Date.now() - this.dialStartedAt > DIAL_WINDOW_MS) {
      console.warn("[Peer] Dial loop timed out");
      this.stopDialLoop();
      return;
    }

    if (!this.peerOpen || !this.peer || !this.localStream) {
      this.dialTimer = window.setTimeout(() => this.dialLoop(), DIAL_RETRY_MS);
      return;
    }

    const target = this.currentDialTarget();
    if (!target || target === this.peer.id) {
      console.log("[Peer] Skipping self-call — waiting for incoming call");
      this.dialTimer = window.setTimeout(() => this.dialLoop(), DIAL_RETRY_MS);
      return;
    }

    if (
      this.activeCalls.length > 0 &&
      !this.remoteConnected &&
      Date.now() - this.lastOutboundAt > 2_500
    ) {
      this.activeCalls.forEach((call) => {
        try {
          call.close();
        } catch {
          /* ignore */
        }
      });
      this.activeCalls = [];
    }

    if (this.activeCalls.length === 0) {
      const call = this.peer.call(target, this.localStream);
      if (call) {
        this.lastOutboundAt = Date.now();
        console.log("[Peer] Outgoing call to", target);
        this.setupCall(call);
      } else {
        console.log("[Peer] peer.call returned null for", target);
      }
    }

    this.dialTimer = window.setTimeout(() => this.dialLoop(), DIAL_RETRY_MS);
  }

  private stopDialLoop() {
    if (this.dialTimer !== null) {
      window.clearTimeout(this.dialTimer);
      this.dialTimer = null;
    }
  }

  private setupCall(call: MediaConnection) {
    this.activeCalls.push(call);

    call.on("stream", (remoteStream) => {
      if (this.remoteStreamCall !== null) {
        console.log("[Peer] Keeping existing remote stream (first-stream-wins)");
        return;
      }
      this.remoteStreamCall = call;
      this.remoteConnected = true;
      this.unavailableStreak = 0;
      this.stopDialLoop();
      console.log("[Peer] Remote stream received");
      this.callbacks?.onRemoteStream(remoteStream);
    });

    call.on("close", () => {
      this.activeCalls = this.activeCalls.filter((c) => c !== call);
      if (call === this.remoteStreamCall) {
        this.remoteStreamCall = null;
        this.remoteConnected = false;
        this.callbacks?.onRemoteDisconnected();
        return;
      }
      if (!this.remoteConnected && this.dialTargets.length > 0) {
        this.dialLoop();
      }
    });

    call.on("error", () => {
      this.activeCalls = this.activeCalls.filter((c) => c !== call);
      if (call === this.remoteStreamCall) {
        this.remoteStreamCall = null;
        this.remoteConnected = false;
        this.callbacks?.onRemoteDisconnected();
        return;
      }
      if (!this.remoteConnected && this.dialTargets.length > 0) {
        const nextIndex = this.dialTargetIndex + 1;
        if (nextIndex < this.dialTargets.length) {
          this.dialTargetIndex = nextIndex;
          console.log("[Peer] Trying alternate dial target:", this.currentDialTarget());
        }
        this.dialLoop();
      }
    });
  }

  /** Flutter endCall() — close media connections, keep peer. */
  endCall() {
    this.stopDialLoop();
    this.activeCalls.forEach((call) => {
      try {
        call.close();
      } catch {
        /* ignore */
      }
    });
    this.activeCalls = [];
    this.remoteStreamCall = null;
    this.remoteConnected = false;
    this.dialTargets = [];
    this.dialTargetIndex = 0;
    this.unavailableStreak = 0;
  }

  /** Flutter diconnectPeer() — full teardown. */
  disconnect() {
    console.log("[Peer] Full teardown (disconnect)");
    this.endCall();
    this.pendingRoomId = null;
    this.openPromise = null;
    this.peerOpen = false;

    if (!this.peer) return;

    try {
      this.peer.disconnect();
    } catch {
      /* ignore */
    }
    try {
      this.peer.destroy();
    } catch {
      /* ignore */
    }
    this.peer = null;
    this.peerUserId = null;
    this.unavailableStreak = 0;
  }

  /** Reset signaling for a new match (rematch / stale connecting). */
  resetForNewMatch() {
    this.stopDialLoop();
    this.endCall();
    if (this.peer && !this.peerOpen) {
      this.disconnect();
    }
  }
}

export const peerService = new PeerService();
