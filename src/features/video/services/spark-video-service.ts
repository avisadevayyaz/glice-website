import type { GliceUser } from "@/features/auth/types";
import { chatSocket } from "@/features/chat/services/socket-service";
import {
  canUseSparkDating,
  fetchIceServers,
  fetchSparkDatingConfig,
  fetchSparkPlanQuota,
  resolveCallLimitSeconds,
} from "../api/video-config-api";
import { ensureLocalStream } from "../lib/ensure-local-stream";
import { resolveDiscoverLocation } from "../lib/discover-location";
import { buildDiscoverFilter } from "../lib/filter-payload";
import { parseTempMessagePayload } from "../lib/parse-temp-message";
import { peerService } from "./peer-service";
import { useVideoCallStore } from "../stores/video-call-store";
import type {
  PeerFoundPayload,
  SparkDatingConfig,
  SparkPlanQuota,
  VideoChatMessage,
  VideoFilterInput,
  VideoPartner,
} from "../types";

const SPARK_EVENT = "spark_dating";
const EMOJI_PREFIX = "__emoji__:";

type SparkHandlers = {
  getLocalStream: () => MediaStream | null;
};

class SparkVideoService {
  private user: GliceUser | null = null;
  private handlers: SparkHandlers | null = null;
  private iceServers: RTCIceServer[] = [];
  private cachedConfig: SparkDatingConfig | null = null;
  private cachedQuota: SparkPlanQuota | null = null;
  private searchTimer: ReturnType<typeof setInterval> | null = null;
  private discoverRetryTimer: ReturnType<typeof setInterval> | null = null;
  private callTimer: ReturnType<typeof setInterval> | null = null;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;
  private searchGeneration = 0;
  private currentFilter: VideoFilterInput | null = null;
  private firstSessionUpdated = false;
  private listenersBound = false;
  private discoverLocation: Awaited<
    ReturnType<typeof resolveDiscoverLocation>
  > = null;
  private preparePromise: Promise<boolean> | null = null;
  private feedbackPartner: VideoPartner | null = null;
  private feedbackContinueAfter = false;
  private feedbackRoomId: string | null = null;
  private matchListenUntil = 0;
  private matchCelebrationTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly onSocketPeerFound = (raw: unknown) => {
    const data = raw as PeerFoundPayload;
    if (!data?.roomId) return;
    void this.onPeerFound(data);
  };

  private readonly onSocketHangUp = (raw: unknown) => {
    const roomId = String(raw ?? "");
    const store = useVideoCallStore.getState();
    if (roomId !== store.roomId) return;
    if (store.stage !== "connected" && store.stage !== "connecting") return;
    this.teardownPeer();
    this.stopCallTimer();
    this.handleSessionEnd(false, true);
  };

  private readonly onSocketMatched = (raw: unknown) => {
    this.onMutualMatch(raw);
  };

  private readonly onSocketNewMessageTemp = (raw: unknown) => {
    this.handleIncomingTempMessage(raw);
  };

  private readonly onSocketUserProfile = (raw: unknown) => {
    const data = raw as {
      roomId?: string;
      email?: string;
      isVideo?: boolean;
    };
    const store = useVideoCallStore.getState();
    if (store.stage !== "connected" || !store.roomId) return;
    if (data.email === this.user?.email) return;
    if (data.roomId !== store.roomId) return;
    store.setRemoteVideoOn(Boolean(data.isVideo));
  };

  private readonly onSocketSparkCount = (raw: unknown) => {
    const data = raw as { count?: number } | number | string;
    const count =
      typeof data === "object" && data !== null && "count" in data
        ? Number(data.count)
        : Number(data);
    if (!Number.isNaN(count)) {
      useVideoCallStore.getState().setOnlineCount(count);
    }
  };

  async prepare(user?: GliceUser | null): Promise<boolean> {
    const activeUser = user ?? this.user;
    if (!activeUser?._id) return false;

    if (this.cachedConfig && this.cachedQuota && this.iceServers.length > 0) {
      const store = useVideoCallStore.getState();
      store.setConfig(this.cachedConfig);
      store.setQuota(this.cachedQuota);
      store.setRoundsLeft(this.cachedConfig.sparkDatingRounds);
      return canUseSparkDating(this.cachedQuota);
    }

    if (this.preparePromise) return this.preparePromise;

    this.preparePromise = (async () => {
      const [ice, config, quota] = await Promise.all([
        fetchIceServers(),
        fetchSparkDatingConfig(),
        fetchSparkPlanQuota(activeUser),
      ]);

      this.iceServers = ice;
      this.cachedConfig = config;
      this.cachedQuota = quota;

      const store = useVideoCallStore.getState();
      store.setConfig(config);
      store.setQuota(quota);
      store.setRoundsLeft(config.sparkDatingRounds);

      if (!canUseSparkDating(quota)) {
        store.setError("You have no spark dating time left.");
        return false;
      }

      store.setError(null);
      return true;
    })();

    try {
      return await this.preparePromise;
    } finally {
      this.preparePromise = null;
    }
  }

  bind(user: GliceUser, handlers: SparkHandlers) {
    this.user = user;
    this.handlers = handlers;
    this.registerSocketListeners();

    peerService.setCallbacks({
      onRemoteStream: (stream) => this.onRemoteConnected(stream),
      onRemoteDisconnected: () => this.onRemoteDisconnected(),
      onPeerOpen: () => {
        /* peer registered — same as Flutter onPeerConnected */
      },
      onError: () => {
        /* non-fatal peer errors are suppressed in peer-service */
      },
    });

    void this.prepare(user);
  }

  unbind() {
    this.unregisterSocketListeners();
    this.stopTimers();
    this.teardownPeer();
    if (this.matchCelebrationTimer) {
      clearTimeout(this.matchCelebrationTimer);
      this.matchCelebrationTimer = null;
    }
    this.feedbackPartner = null;
    this.feedbackRoomId = null;
    this.matchListenUntil = 0;
    this.user = null;
    this.handlers = null;
    this.currentFilter = null;
    this.firstSessionUpdated = false;
    this.cachedConfig = null;
    this.cachedQuota = null;
    this.iceServers = [];
  }

  joinLobby() {
    if (!this.user) return;
    chatSocket.emitEvent("join_event", {
      name: SPARK_EVENT,
      email: this.user.email,
    });
    chatSocket.emitEvent("get_joined_count", SPARK_EVENT);
  }

  leaveLobby() {
    if (!this.user) return;
    chatSocket.emitEvent("leave_event", {
      name: SPARK_EVENT,
      email: this.user.email,
    });
  }

  async startSearch(filter: VideoFilterInput) {
    if (!this.user) return;

    const generation = ++this.searchGeneration;
    const store = useVideoCallStore.getState();

    this.clearConnectTimeout();
    if (store.stage === "connecting") {
      this.teardownPeer();
    }

    const socketReady = await chatSocket.waitUntilConnected(12_000);
    if (generation !== this.searchGeneration) return;

    if (!socketReady) {
      store.setError("Connecting to server… try again in a moment.");
      return;
    }

    await chatSocket.ensureSessionReady();
    if (generation !== this.searchGeneration) return;

    const ok = await this.prepare(this.user);
    if (generation !== this.searchGeneration) return;
    if (!ok) return;

    const latest = useVideoCallStore.getState();
    if (latest.roundsLeft <= 0) {
      latest.setError("No rounds left for today.");
      return;
    }

    this.currentFilter = filter;
    peerService.endCall();
    latest.resetCall();
    latest.clearMessages();
    latest.setError(null);
    latest.setEndedByMe(true);

    this.discoverLocation = await resolveDiscoverLocation(this.user);
    if (generation !== this.searchGeneration) return;

    const stream = await ensureLocalStream(
      () => this.handlers?.getLocalStream() ?? null,
    );
    if (generation !== this.searchGeneration) return;
    if (!stream) {
      latest.setError("Camera not available. Allow camera access and try again.");
      latest.setStage("idle");
      return;
    }
    peerService.setLocalStream(stream);

    await this.ensureIceServers();
    if (generation !== this.searchGeneration) return;

    latest.setStage("searching");

    // Flutter onLoadStop: init peer in background — discover must not wait for it.
    void peerService.init(this.user._id, this.iceServers).catch((err) => {
      console.warn("[Spark] Background peer init:", err);
    });

    if (generation !== this.searchGeneration) return;

    this.beginSearchTimer();
    this.emitDiscover();
    this.startDiscoverRetry();
    this.joinLobby();
  }

  cancelSearch() {
    this.searchGeneration += 1;
    this.stopTimers();
    this.clearConnectTimeout();
    const stage = useVideoCallStore.getState().stage;
    if (stage === "connecting") {
      this.teardownPeer();
    } else {
      peerService.endCall();
    }
    useVideoCallStore.getState().setStage("idle");
  }

  /** End session and return to idle after feedback (Flutter goBack). */
  endCall() {
    this.finishSession({ endedByMe: true, continueAfterFeedback: false });
  }

  /** Skip to next person — hang up, feedback, then auto re-search. */
  nextPerson() {
    this.finishSession({ endedByMe: true, continueAfterFeedback: true });
  }

  private finishSession({
    endedByMe,
    continueAfterFeedback,
  }: {
    endedByMe: boolean;
    continueAfterFeedback: boolean;
  }) {
    const store = useVideoCallStore.getState();
    store.setEndedByMe(endedByMe);
    store.setContinueAfterFeedback(continueAfterFeedback);
    this.emitHangUp();
    this.teardownPeer();
    this.stopCallTimer();
    window.setTimeout(() => {
      this.handleSessionEnd(endedByMe, continueAfterFeedback);
    }, 400);
  }

  submitFeedback(liked: boolean | null) {
    const store = useVideoCallStore.getState();
    const { partner, roomId, continueAfterFeedback } = store;

    if (!this.user || !partner || !roomId || liked === null) {
      this.afterFeedback(continueAfterFeedback);
      return;
    }

    this.feedbackPartner = partner;
    this.feedbackContinueAfter = continueAfterFeedback;
    this.feedbackRoomId = roomId;
    this.matchListenUntil = liked
      ? Date.now() + 30_000
      : 0;

    const delayMs = 1000 + Math.floor(Math.random() * 2000);
    window.setTimeout(() => {
      chatSocket.emitEvent("user_feedback", {
        name: SPARK_EVENT,
        feedback: liked,
        email: this.user?.email,
        userId: this.user?._id,
        roomId,
      });
    }, delayMs);

    // Flutter: emit feedback then continue — never block waiting for the other user.
    this.afterFeedback(continueAfterFeedback);
  }

  sendChatMessage(text: string) {
    const store = useVideoCallStore.getState();
    const partner = store.partner;
    if (
      !this.user ||
      !partner ||
      !text.trim() ||
      (store.stage !== "connected" && store.stage !== "connecting")
    ) {
      return;
    }

    chatSocket.emitEvent("send_message_temp", {
      receiverId: partner.id,
      senderId: this.user._id,
      message: text.trim(),
    });

    const message: VideoChatMessage = {
      id: `local-${Date.now()}`,
      senderId: this.user._id,
      text: text.trim(),
      time: formatTime(),
      isMine: true,
    };
    store.addMessage(message);
  }

  notifyVideoState(isVideo: boolean) {
    const store = useVideoCallStore.getState();
    if (!this.user || !store.roomId) return;
    chatSocket.emitEvent("user-profile", {
      profile: this.user.profileUrl ?? "",
      isVideo,
      email: this.user.email,
      roomId: store.roomId,
    });
  }

  /** Always refresh Cloudflare TURN credentials before WebRTC (short TTL). */
  private async ensureIceServers(fresh = true) {
    this.iceServers = await fetchIceServers({ fresh });
  }

  private afterFeedback(continueAfterFeedback: boolean) {
    const store = useVideoCallStore.getState();
    store.setFeedbackPhase("done");
    store.resetCall();

    if (continueAfterFeedback && this.currentFilter) {
      void this.startSearch(this.currentFilter);
      return;
    }

    store.setStage("idle");
  }

  private handleSessionEnd(
    endedByMe: boolean,
    continueAfterFeedback = false,
  ) {
    const store = useVideoCallStore.getState();
    const shouldFeedback = store.everConnected;

    store.clearMediaState();
    store.setEverConnected(false);

    if (shouldFeedback) {
      store.setEndedByMe(endedByMe);
      store.setContinueAfterFeedback(continueAfterFeedback);
      store.setFeedbackPhase("pending");
      store.setMutualMatch(false, null);
      store.setStage("feedback");
      return;
    }

    store.resetCall();

    if (continueAfterFeedback && this.currentFilter) {
      void this.startSearch(this.currentFilter);
      return;
    }

    store.setStage("idle");
  }

  private async onPeerFound(data: PeerFoundPayload) {
    if (!this.user) return;

    const store = useVideoCallStore.getState();
    if (store.stage === "connected" || store.stage === "connecting") return;

    store.setRoomId(data.roomId);
    store.setPartner({
      id: data.otherUser,
      name: data.otherUserName || "Match",
      profileUrl: data.otherUserProfilePic ?? "",
    });
    store.setStage("connecting");

    this.stopSearchTimer();

    const stream = await ensureLocalStream(
      () => this.handlers?.getLocalStream() ?? null,
    );
    if (!stream) {
      store.setError("Camera not available. Allow camera access and try again.");
      store.setStage("idle");
      return;
    }
    peerService.setLocalStream(stream);
    await this.ensureIceServers();

    const roomId = data.roomId || data.otherUser;
    const otherUser = data.otherUser;

    // Flutter: init(userId, iceServers, roomId) — also try otherUser if roomId is self
    void peerService
      .init(this.user._id, this.iceServers, roomId, otherUser)
      .catch((err) => {
        console.warn("[Spark] Peer init on match failed:", err);
      });

    this.startConnectTimeout();
  }

  private startConnectTimeout() {
    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.connectTimer = setTimeout(() => {
      const store = useVideoCallStore.getState();
      if (store.stage !== "connecting") return;
      store.setError("Could not connect video. Tap Start to try again.");
      this.teardownPeer();
      store.setStage("idle");
    }, 45_000);
  }

  private clearConnectTimeout() {
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
  }

  private onRemoteConnected(stream: MediaStream) {
    this.clearConnectTimeout();
    const store = useVideoCallStore.getState();
    store.setRemoteStream(stream);
    store.setEverConnected(true);
    store.setStage("connected");
    store.setError(null);
    this.stopSearchTimer();
    this.startCallTimer();

    if (!this.firstSessionUpdated && this.user) {
      this.firstSessionUpdated = true;
      chatSocket.emitEvent("update_spark_dating", this.user._id);
    }

    this.notifyVideoState(true);
  }

  private onRemoteDisconnected() {
    const store = useVideoCallStore.getState();
    if (store.stage !== "connected") return;
    store.setRemoteStream(null);
  }

  private handleIncomingTempMessage(raw: unknown) {
    const store = useVideoCallStore.getState();
    if (
      (store.stage !== "connected" && store.stage !== "connecting") ||
      !this.user
    ) {
      return;
    }

    const data = parseTempMessagePayload(raw);
    if (!data?.message) return;
    if (data.message.startsWith(EMOJI_PREFIX)) return;

    const myId = this.user._id;
    const senderId = data.senderId;
    if (!senderId || senderId === myId) return;

    const partnerId = store.partner?.id;
    const addressedToMe =
      !data.receiverId || data.receiverId === myId;
    const fromPartner = !partnerId || senderId === partnerId;
    if (!fromPartner && !addressedToMe) return;

    const message: VideoChatMessage = {
      id: `remote-${Date.now()}-${Math.random()}`,
      senderId,
      text: data.message,
      time: formatTime(),
      isMine: false,
    };
    store.addMessage(message);
  }

  private registerSocketListeners() {
    if (this.listenersBound) return;

    chatSocket.onEvent("peer_found", this.onSocketPeerFound);
    chatSocket.onEvent("hangUp", this.onSocketHangUp);
    chatSocket.onEvent("matched", this.onSocketMatched);
    chatSocket.onEvent("new_message_temp", this.onSocketNewMessageTemp);
    chatSocket.onEvent("user-profile", this.onSocketUserProfile);
    chatSocket.onEvent("spark_count", this.onSocketSparkCount);
    this.listenersBound = true;
  }

  private unregisterSocketListeners() {
    if (!this.listenersBound) return;

    chatSocket.offEvent("peer_found", this.onSocketPeerFound);
    chatSocket.offEvent("hangUp", this.onSocketHangUp);
    chatSocket.offEvent("matched", this.onSocketMatched);
    chatSocket.offEvent("new_message_temp", this.onSocketNewMessageTemp);
    chatSocket.offEvent("user-profile", this.onSocketUserProfile);
    chatSocket.offEvent("spark_count", this.onSocketSparkCount);
    this.listenersBound = false;
  }

  private emitDiscover() {
    if (!this.user || !this.currentFilter) return;
    if (!chatSocket.isConnected()) return;

    const config = useVideoCallStore.getState().config;
    const filter = buildDiscoverFilter(
      this.currentFilter,
      config?.distanceMaxThreshold ?? 100,
      this.discoverLocation,
    );

    chatSocket.emitEvent("discover", {
      filter,
      name: SPARK_EVENT,
      email: this.user.email,
    });
  }

  private startDiscoverRetry() {
    this.stopDiscoverRetry();
    this.discoverRetryTimer = setInterval(() => {
      const stage = useVideoCallStore.getState().stage;
      if (stage !== "searching") {
        this.stopDiscoverRetry();
        return;
      }
      if (!chatSocket.isConnected()) return;
      this.emitDiscover();
    }, 25_000);
  }

  private stopDiscoverRetry() {
    if (this.discoverRetryTimer) {
      clearInterval(this.discoverRetryTimer);
      this.discoverRetryTimer = null;
    }
  }

  private emitHangUp() {
    if (!this.user || !this.currentFilter) return;
    const store = useVideoCallStore.getState();
    const config = store.config;
    const filter = buildDiscoverFilter(
      this.currentFilter,
      config?.distanceMaxThreshold ?? 100,
      this.discoverLocation,
    );

    chatSocket.emitEvent("hang_up", {
      "filter ": filter,
      name: SPARK_EVENT,
      roomId: store.roomId ?? this.user._id,
      userId: this.user._id,
    });
  }

  private beginSearchTimer() {
    const store = useVideoCallStore.getState();
    const maxWait = store.config?.maxWaitTime ?? 90;
    store.setSearchSecondsLeft(maxWait);
    store.setRoundsLeft(Math.max(0, store.roundsLeft - 1));

    this.stopSearchTimer();
    this.searchTimer = setInterval(() => {
      const left = useVideoCallStore.getState().searchSecondsLeft - 1;
      useVideoCallStore.getState().setSearchSecondsLeft(left);
      if (left <= 0) {
        this.stopSearchTimer();
        peerService.endCall();
        useVideoCallStore.getState().setError("No match found. Try again.");
        useVideoCallStore.getState().setStage("idle");
      }
    }, 1000);
  }

  private startCallTimer() {
    const store = useVideoCallStore.getState();
    const config = store.config;
    const quota = store.quota;
    if (!config || !quota) return;

    const limit = resolveCallLimitSeconds(config, quota);
    store.setCallSecondsLeft(limit);

    this.stopCallTimer();
    this.callTimer = setInterval(() => {
      const left = useVideoCallStore.getState().callSecondsLeft - 1;
      useVideoCallStore.getState().setCallSecondsLeft(left);
      if (left <= 0) {
        this.endCall();
      }
    }, 1000);
  }

  private stopSearchTimer() {
    if (this.searchTimer) {
      clearInterval(this.searchTimer);
      this.searchTimer = null;
    }
    this.stopDiscoverRetry();
  }

  private stopCallTimer() {
    if (this.callTimer) {
      clearInterval(this.callTimer);
      this.callTimer = null;
    }
  }

  private stopTimers() {
    this.stopSearchTimer();
    this.stopCallTimer();
    this.clearConnectTimeout();
  }

  private onMutualMatch(raw: unknown) {
    const store = useVideoCallStore.getState();
    const withinWindow = Date.now() <= this.matchListenUntil;
    if (
      !withinWindow &&
      store.stage !== "feedback" &&
      store.stage !== "searching"
    ) {
      return;
    }

    const data = raw as {
      roomId?: string;
      otherUser?: {
        uid?: string;
        _id?: string;
        email?: string;
        name?: string;
        profileUrl?: string;
      };
    };

    const snapshot = this.feedbackPartner;
    const otherId = data.otherUser?.uid ?? data.otherUser?._id ?? "";
    const roomId = data.roomId ?? this.feedbackRoomId ?? store.roomId;

    const samePartner =
      !snapshot ||
      !otherId ||
      otherId === snapshot.id ||
      data.otherUser?.email === snapshot.id ||
      Boolean(roomId && roomId === this.feedbackRoomId);

    if (!samePartner) return;

    this.searchGeneration += 1;
    this.stopSearchTimer();
    this.stopDiscoverRetry();

    const celebrationPartner: VideoPartner = snapshot ?? {
      id: otherId,
      name: data.otherUser?.name ?? "Match",
      profileUrl: data.otherUser?.profileUrl ?? "",
    };

    store.setPartner(celebrationPartner);
    store.setRoomId(roomId ?? null);
    store.setMutualMatch(true, roomId ?? null);
    store.setFeedbackPhase("matched");
    store.setStage("feedback");

    if (this.matchCelebrationTimer) {
      clearTimeout(this.matchCelebrationTimer);
    }
    this.matchCelebrationTimer = setTimeout(() => {
      this.matchCelebrationTimer = null;
      this.dismissMatchCelebration();
    }, 2800);
  }

  private dismissMatchCelebration() {
    const store = useVideoCallStore.getState();
    store.setMutualMatch(false, null);
    store.setFeedbackPhase("done");
    store.resetCall();
    this.feedbackPartner = null;
    this.feedbackRoomId = null;
    this.matchListenUntil = 0;

    if (this.feedbackContinueAfter && this.currentFilter) {
      void this.startSearch(this.currentFilter);
      return;
    }

    store.setStage("idle");
  }

  /** Close active media connections (Flutter endCall). */
  private cleanupPeer() {
    this.clearConnectTimeout();
    peerService.endCall();
    useVideoCallStore.getState().setRemoteStream(null);
  }

  /** Full peer teardown (Flutter diconnectPeer). */
  private teardownPeer() {
    this.cleanupPeer();
    peerService.disconnect();
  }
}

function formatTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const sparkVideoService = new SparkVideoService();
