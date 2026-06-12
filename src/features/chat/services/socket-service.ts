import { io, type Socket } from "socket.io-client";
import { tokenStorage } from "@/features/auth/lib/token-storage";
import type { GliceUser } from "@/features/auth/types";
import {
  defaultLocation,
  isPersistableMediaAttachment,
  messageToPayload,
} from "../lib/parsers";
import {
  buildMessagePreview,
  notifyIncomingMessage,
  resolveSenderName,
} from "../lib/chat-notifications";
import { parseTypingRoomId } from "../lib/parse-typing-event";
import { useMessageStore } from "../stores/message-store";
import { useRoomStore } from "../stores/room-store";
import { useSocketStore } from "../stores/socket-store";
import type { ChatMessage, UserLocation } from "../types";

type ConnectParams = {
  user: GliceUser;
  location?: UserLocation;
};

const SERVER_OFFLINE_MESSAGE =
  "Server is not responding. Please check your connection and try again.";

function parseSocketErrorPayload(raw: unknown): string | null {
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (raw && typeof raw === "object") {
    const map = raw as Record<string, unknown>;
    for (const key of ["message", "error", "msg", "data"]) {
      const val = map[key];
      if (typeof val === "string" && val.trim()) return val.trim();
    }
  }
  return null;
}

class ChatSocketService {
  private socket: Socket | null = null;
  private externalHandlers = new Map<
    string,
    Set<(...args: unknown[]) => void>
  >();
  private user: GliceUser | null = null;
  private location: UserLocation = defaultLocation();
  private currentRoomId = "";
  private connectedEmail: string | null = null;
  private convosLoading = false;
  private msgTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingFetchRoomId: string | null = null;
  private pendingMessageFetch: string | null = null;
  private messageFetchRetries = new Map<string, number>();
  private visibilityBound = false;

  connect({ user, location }: ConnectParams): void {
    if (this.socket?.connected && this.user?._id === user._id) {
      return;
    }

    const sameUser = this.user?._id === user._id;
    if (!sameUser) {
      this.logout();
    } else {
      this.teardownSocket();
    }

    this.user = user;
    this.location = location ?? defaultLocation();

    const url = process.env.NEXT_PUBLIC_API_URL ?? "";
    if (!url) {
      useSocketStore.getState().setError("API URL is not configured");
      return;
    }

    const token = tokenStorage.getAccessToken();
    useSocketStore.getState().setPhase("connecting");

    this.socket = io(url, {
      auth: { auth: token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 8000,
      timeout: 20000,
    });

    this.registerListeners();
    this.attachExternalListeners();
    this.bindVisibilityReconnect();
  }

  private attachExternalListeners(socket: Socket | null = this.socket): void {
    if (!socket) return;
    for (const [event, handlers] of this.externalHandlers) {
      for (const handler of handlers) {
        socket.off(event, handler);
        socket.on(event, handler);
      }
    }
  }

  private bindVisibilityReconnect(): void {
    if (this.visibilityBound || typeof document === "undefined") return;
    this.visibilityBound = true;

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible" || !this.user) return;
      if (this.socket?.connected) return;

      const token = tokenStorage.getAccessToken();
      if (this.socket) {
        this.socket.auth = { auth: token };
        this.socket.connect();
        return;
      }

      this.connect({ user: this.user, location: this.location });
    });
  }

  private patchUserFromServer(data: unknown): void {
    if (!this.user || !data || typeof data !== "object" || Array.isArray(data)) {
      return;
    }

    const map = data as Record<string, unknown>;
    const id = String(map._id ?? map.id ?? "").trim();
    if (!id || this.user._id === id) return;

    this.user = {
      ...this.user,
      _id: id,
      name: String(map.name ?? this.user.name ?? ""),
      username: String(map.username ?? this.user.username ?? ""),
      profileUrl: String(map.profileUrl ?? this.user.profileUrl ?? ""),
    };
    tokenStorage.setUser(this.user);
    this.flushPendingMessageFetch();
  }

  private flushPendingMessageFetch(): void {
    if (!this.pendingMessageFetch || !this.user?._id?.trim()) return;
    const roomId = this.pendingMessageFetch;
    this.pendingMessageFetch = null;
    if (useMessageStore.getState().getMessages(roomId).length === 0) {
      this.fetchMessages(roomId);
    }
  }

  logout(): void {
    this.teardownSocket();
    this.resetState();
  }

  disconnect(): void {
    this.logout();
  }

  private teardownSocket(): void {
    if (this.msgTimeout) {
      clearTimeout(this.msgTimeout);
      this.msgTimeout = null;
    }
    if (this.socket) {
      this.socket.emit("disconnect_user");
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectedEmail = null;
    this.convosLoading = false;
    this.pendingFetchRoomId = null;
    this.pendingMessageFetch = null;
    this.messageFetchRetries.clear();
  }

  private resetState(): void {
    this.user = null;
    this.currentRoomId = "";
    useSocketStore.getState().reset();
    useRoomStore.getState().reset();
    useMessageStore.getState().reset();
  }

  private registerListeners(): void {
    const socket = this.socket;
    if (!socket) return;

    socket.on("connect", () => {
      const token = tokenStorage.getAccessToken();
      if (token && socket) {
        socket.auth = { auth: token };
      }
      useSocketStore.getState().dismissServerAlert();
      useSocketStore.getState().setPhase("connected");
      this.connectedEmail = null;
      this.attachExternalListeners(socket);
      if (this.user?.email) {
        this.emitConnectUser();
      }
      if (this.user?._id?.trim()) {
        this.flushPendingMessageFetch();
        if (this.currentRoomId) {
          this.ensureMessagesLoaded(this.currentRoomId);
        }
      }
    });

    socket.io.on("reconnect_attempt", () => {
      useSocketStore.getState().setPhase("reconnecting");
    });

    socket.io.on("reconnect_failed", () => {
      useSocketStore.getState().showServerAlert(SERVER_OFFLINE_MESSAGE);
    });

    socket.io.on("reconnect", () => {
      useSocketStore.getState().dismissServerAlert();
      this.connectedEmail = null;
      useSocketStore.getState().setPhase("connected", "Back online");
      this.attachExternalListeners(socket);
      if (this.user?.email) {
        this.emitConnectUser();
      }
      if (this.user?._id?.trim()) {
        this.flushPendingMessageFetch();
        if (this.currentRoomId) {
          this.ensureMessagesLoaded(this.currentRoomId);
        }
      }
    });

    socket.on("disconnect", () => {
      this.connectedEmail = null;
      useSocketStore.getState().setPhase("disconnected");
    });

    socket.on("connect_error", () => {
      useSocketStore.getState().setPhase("reconnecting");
    });

    socket.on("user_connected", (data) => {
      this.patchUserFromServer(data);
      useSocketStore.getState().setPhase("syncing");
      this.fetchConversations();
      this.flushPendingMessageFetch();
    });

    socket.on("all_convo", (data) => {
      this.convosLoading = false;
      useRoomStore.getState().setAllRooms(data);
      useSocketStore.getState().setPhase("ready");
    });

    socket.on("convo_error", () => {
      this.convosLoading = false;
      useRoomStore.getState().setLoading(false);
      useSocketStore.getState().setPhase("ready");
    });

    socket.on("boost_error", () => {
      /* logged server-side; no user popup */
    });

    socket.on("sparks_error", () => {
      /* logged server-side; no user popup */
    });

    socket.on("all_messages", (data) => {
      const raw =
        data && typeof data === "object" && !Array.isArray(data)
          ? (data as Record<string, unknown>)
          : {};
      const roomId = String(
        raw.roomId ?? this.pendingFetchRoomId ?? "",
      );
      this.finishMessageFetch(roomId, false);
      useMessageStore.getState().setMessages(data);
    });

    socket.on("all_messages:error", () => {
      const roomId =
        this.pendingFetchRoomId ?? useMessageStore.getState().activeRoomId;
      if (!roomId) return;

      const retries = this.messageFetchRetries.get(roomId) ?? 0;
      if (retries < 2) {
        this.messageFetchRetries.set(roomId, retries + 1);
        this.finishMessageFetch(roomId, false);
        window.setTimeout(() => this.fetchMessages(roomId), 700 * (retries + 1));
        return;
      }

      this.finishMessageFetch(roomId, true);
    });

    socket.on("recieve_message", (data: unknown) => {
      let msg = data;
      let ack: ((value: string) => void) | null = null;

      if (Array.isArray(data)) {
        msg = data[0];
        const last = data[data.length - 1];
        if (typeof last === "function") ack = last as (value: string) => void;
      }

      const payload = msg as Record<string, unknown>;
      const message = useMessageStore.getState().addMessage(payload);

      useRoomStore.getState().updateRoom({
        roomId: message.roomId,
        time: message.timestamp,
        typing: false,
        currentUserId: this.user?._id,
        recentMessage: {
          sender: message.sender,
          text: message.text || (message.attachment ? "Attachment" : ""),
          unsend: false,
        },
      });

      notifyIncomingMessage({
        roomId: message.roomId,
        senderId: message.sender,
        senderName: resolveSenderName(message.roomId, message.sender),
        preview: buildMessagePreview(
          message.text,
          message.attachment?.type,
        ),
        currentUserId: this.user?._id,
      });

      if (ack && this.currentRoomId === message.roomId) {
        ack("ACK");
      }
    });

    socket.on("update_message", (data) => {
      useMessageStore.getState().updateMessageId(data as Record<string, unknown>);
    });

    socket.on("unsend", (data) => {
      const payload = data as Record<string, unknown>;
      const roomId = String(payload.roomId ?? "");
      const messageId = String(payload.id ?? "");
      const isLast = useMessageStore
        .getState()
        .deleteMessage(roomId, messageId, true);
      if (isLast) {
        useRoomStore.getState().updateRoom({ roomId, unsend: true });
      }
    });

    socket.on("user_typing", (data: unknown) => {
      const roomId = parseTypingRoomId(data);
      if (roomId) {
        useRoomStore.getState().addTyping(roomId);
      }
    });

    socket.on("matched", (data) => {
      useRoomStore.getState().addRoom(data);
    });

    socket.on("unmatch_user", (data) => {
      const roomId =
        typeof data === "string"
          ? data
          : String((data as { roomId?: string }).roomId ?? "");
      if (roomId) {
        useRoomStore.getState().removeRoom(roomId);
        useMessageStore.getState().deleteRoom(roomId);
      }
    });

    socket.on("deleted_room", (data) => {
      const roomId = String(data ?? "");
      if (roomId) {
        useRoomStore.getState().removeRoom(roomId);
        useMessageStore.getState().deleteRoom(roomId);
      }
    });

    socket.on("blocked_user", (roomId: string) => {
      useRoomStore.getState().removeRoom(roomId);
      useMessageStore.getState().deleteRoom(roomId);
    });

    socket.on("unblocked_user", (data) => {
      useRoomStore.getState().addRoom(data);
    });

    socket.on("connect_match", (data: unknown) => {
      const arr = data as [string, boolean?, boolean?];
      useRoomStore
        .getState()
        .setStatus(arr[0] ?? "", true, Boolean(arr[1]));
    });

    socket.on("disconnect_match", (email: string) => {
      useRoomStore.getState().setStatus(email, false, false);
    });
  }

  private finishMessageFetch(roomId: string, failed: boolean): void {
    if (this.msgTimeout) {
      clearTimeout(this.msgTimeout);
      this.msgTimeout = null;
    }
    if (roomId) {
      useMessageStore.getState().setLoading(roomId, false);
      if (failed) {
        if (useMessageStore.getState().getMessages(roomId).length === 0) {
          useMessageStore.getState().setLoadError(roomId, true);
        }
      } else {
        useMessageStore.getState().setLoadError(roomId, false);
        this.messageFetchRetries.delete(roomId);
      }
    }
    if (!failed || !roomId) {
      this.pendingFetchRoomId = null;
    }
  }

  private scheduleMessageFetchTimeout(roomId: string): void {
    if (this.msgTimeout) {
      clearTimeout(this.msgTimeout);
    }
    this.msgTimeout = setTimeout(() => {
      const retries = this.messageFetchRetries.get(roomId) ?? 0;
      if (retries < 2) {
        this.messageFetchRetries.set(roomId, retries + 1);
        useMessageStore.getState().setLoading(roomId, false);
        this.pendingFetchRoomId = null;
        this.fetchMessages(roomId);
        return;
      }
      this.finishMessageFetch(roomId, true);
    }, 10_000);
  }

  private emitConnectUser(): void {
    if (!this.user?.email || !this.socket) return;
    if (this.connectedEmail === this.user.email) return;

    useSocketStore.getState().setPhase("authenticating");
    this.connectedEmail = this.user.email;
    this.socket.emit("connect_user", { email: this.user.email });
  }

  setLocation(location: UserLocation): void {
    this.location = location;
  }

  fetchConversations(): void {
    if (!this.socket || !this.user || this.convosLoading) return;
    if (!this.user._id?.trim()) return;
    this.convosLoading = true;
    useRoomStore.getState().setLoading(true);
    this.socket.emit("get_all_convo", {
      userId: this.user._id,
      location: this.location,
    });
  }

  setCurrentRoom(roomId: string): void {
    this.currentRoomId = roomId;
    useRoomStore.getState().enterRoom(roomId);
  }

  clearCurrentRoom(): void {
    this.currentRoomId = "";
    useRoomStore.getState().exitRoom();
  }

  enterConversation(roomId: string): void {
    if (!roomId) return;

    this.setCurrentRoom(roomId);
    useMessageStore.getState().setActiveRoom(roomId);

    if (!this.user) return;

    const room = useRoomStore.getState().getRoom(roomId);
    if (room?.unread) {
      useRoomStore.getState().updateUnread(roomId, 0);
      this.markRead(roomId);
    }

    const messages = useMessageStore.getState().getMessages(roomId);
    if (messages.length === 0 && !useMessageStore.getState().isLoading(roomId)) {
      this.fetchMessages(roomId);
    }
  }

  /** Retry fetch when socket/user becomes ready after opening a thread. */
  ensureMessagesLoaded(roomId: string): void {
    if (!roomId) return;
    const messages = useMessageStore.getState().getMessages(roomId);
    const loading = useMessageStore.getState().isLoading(roomId);
    const error = useMessageStore.getState().hasLoadError(roomId);
    if (messages.length === 0 && !loading) {
      this.fetchMessages(roomId);
    } else if (error && messages.length === 0 && !loading) {
      useMessageStore.getState().setLoadError(roomId, false);
      this.messageFetchRetries.delete(roomId);
      this.fetchMessages(roomId);
    }
  }

  leaveConversation(): void {
    this.clearCurrentRoom();
  }

  fetchMessages(roomId: string, page = 0): void {
    if (!this.socket || !this.user) return;

    const userId = this.user._id?.trim();
    if (!this.socket.connected || !userId) {
      this.pendingMessageFetch = roomId;
      return;
    }

    if (useMessageStore.getState().isLoading(roomId)) return;

    this.pendingFetchRoomId = roomId;
    useMessageStore.getState().setLoading(roomId, true);
    useMessageStore.getState().setLoadError(roomId, false);

    const pagination = useMessageStore.getState().getPagination(roomId);
    const payload =
      page > 0
        ? {
            roomId,
            currentPage: page,
            totalPages: pagination.totalPages,
            totalMessages: pagination.totalMessages,
            messages: [],
          }
        : { roomId };

    this.socket.emit("get_all", { ...payload, userId });
    this.scheduleMessageFetchTimeout(roomId);
  }

  markRead(roomId: string): void {
    if (!this.socket || !this.user) return;
    this.socket.emit("read_all", {
      sender: this.user._id,
      roomId,
    });
  }

  /** Mirrors Flutter SendTypingEvent — reciever is the match email. */
  sendTyping(roomId: string, receiverEmail: string): void {
    if (!this.socket || !receiverEmail) return;
    this.socket.emit("send_typing", {
      roomId,
      reciever: receiverEmail,
    });
  }

  sendMessage(params: {
    message: ChatMessage;
    recipientEmail: string;
    senderEmail: string;
    username: string;
  }): void {
    if (!this.socket) return;

    const { message } = params;
    if (
      message.attachment &&
      !isPersistableMediaAttachment(message.attachment)
    ) {
      return;
    }

    this.socket.emit("send_message", {
      recipientEmail: params.recipientEmail,
      senderEmail: params.senderEmail,
      username: params.username,
      message: messageToPayload(message),
    });
  }

  unsendMessage(params: {
    recipientEmail: string;
    messageId: string;
    roomId: string;
    updateText: string;
  }): void {
    if (!this.socket) return;
    this.socket.emit("unsend_message", {
      recipientEmail: params.recipientEmail,
      msg: {
        id: params.messageId,
        roomId: params.roomId,
        updateText: params.updateText,
      },
    });
  }

  deleteRoom(roomId: string): void {
    if (!this.socket || !this.user) return;
    this.socket.emit("delete_room", {
      userId: this.user._id,
      roomId,
    });
    useRoomStore.getState().removeRoom(roomId);
    useMessageStore.getState().deleteRoom(roomId);
  }

  blockUser(roomId: string, blockeeEmail: string): void {
    if (!this.socket) return;
    this.socket.emit("block_user", { blockeeEmail, roomId });
    useRoomStore.getState().removeRoom(roomId);
    useMessageStore.getState().deleteRoom(roomId);
  }

  unmatch(roomId: string, matchId: string, email: string): void {
    if (!this.socket) return;
    this.socket.emit("unmatch", { matchId, roomId, email });
  }

  isConnected(): boolean {
    return Boolean(this.socket?.connected);
  }

  /** Wait until the socket transport is connected (or timeout). */
  waitUntilConnected(timeoutMs = 12_000): Promise<boolean> {
    if (this.socket?.connected) return Promise.resolve(true);

    return new Promise((resolve) => {
      const deadline = Date.now() + timeoutMs;
      let onConnect: (() => void) | null = null;

      const cleanup = () => {
        if (onConnect && this.socket) {
          this.socket.off("connect", onConnect);
        }
      };

      const poll = () => {
        const socket = this.socket;
        if (socket?.connected) {
          cleanup();
          resolve(true);
          return;
        }
        if (Date.now() >= deadline) {
          cleanup();
          resolve(false);
          return;
        }

        if (socket && !onConnect) {
          onConnect = () => {
            cleanup();
            resolve(true);
          };
          socket.on("connect", onConnect);
        }

        window.setTimeout(poll, 150);
      };

      poll();
    });
  }

  /**
   * Ensures connect_user was emitted and the server had time to register the session.
   * Mirrors Flutter socket init before discover.
   */
  ensureSessionReady(timeoutMs = 2500): Promise<boolean> {
    const socket = this.socket;
    if (!socket?.connected || !this.user?.email) return Promise.resolve(false);

    if (this.connectedEmail === this.user.email) {
      return Promise.resolve(true);
    }

    this.emitConnectUser();

    return new Promise((resolve) => {
      let settled = false;

      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        socket.off("user_connected", onUserConnected);
        window.clearTimeout(timer);
        resolve(ok);
      };

      const onUserConnected = () => finish(true);
      const timer = window.setTimeout(() => finish(true), timeoutMs);

      socket.once("user_connected", onUserConnected);
    });
  }

  getUser(): GliceUser | null {
    return this.user;
  }

  /** Shared socket emit for spark dating / video events. */
  emitEvent(event: string, payload?: unknown): void {
    this.socket?.emit(event, payload);
  }

  /** Register a listener on the shared socket (e.g. spark dating). */
  onEvent(event: string, handler: (...args: unknown[]) => void): void {
    if (!this.externalHandlers.has(event)) {
      this.externalHandlers.set(event, new Set());
    }
    this.externalHandlers.get(event)!.add(handler);
    this.socket?.on(event, handler);
  }

  offEvent(event: string, handler?: (...args: unknown[]) => void): void {
    const handlers = this.externalHandlers.get(event);
    if (handler) {
      handlers?.delete(handler);
      this.socket?.off(event, handler);
      if (handlers?.size === 0) {
        this.externalHandlers.delete(event);
      }
      return;
    }

    if (handlers) {
      for (const bound of handlers) {
        this.socket?.off(event, bound);
      }
      this.externalHandlers.delete(event);
    }
    this.socket?.off(event);
  }
}

export const chatSocket = new ChatSocketService();
