import { io, type Socket } from "socket.io-client";
import { tokenStorage } from "@/features/auth/lib/token-storage";
import type { GliceUser } from "@/features/auth/types";
import {
  defaultLocation,
  isPersistableMediaAttachment,
  messageToPayload,
} from "../lib/parsers";
import { useMessageStore } from "../stores/message-store";
import { useRoomStore } from "../stores/room-store";
import { useSocketStore } from "../stores/socket-store";
import type { ChatMessage, UserLocation } from "../types";

type ConnectParams = {
  user: GliceUser;
  location?: UserLocation;
};

class ChatSocketService {
  private socket: Socket | null = null;
  private user: GliceUser | null = null;
  private location: UserLocation = defaultLocation();
  private currentRoomId = "";
  private connectedEmail: string | null = null;
  private convosLoading = false;
  private msgsLoading = false;
  private msgTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingFetchRoomId: string | null = null;

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
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      forceNew: true,
    });

    this.registerListeners();
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
    this.msgsLoading = false;
    this.pendingFetchRoomId = null;
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
      useSocketStore.getState().setPhase("connected");
      this.connectedEmail = null;
      if (this.user?.email) {
        this.emitConnectUser();
      }
    });

    socket.io.on("reconnect_attempt", () => {
      useSocketStore.getState().setPhase("reconnecting");
    });

    socket.io.on("reconnect", () => {
      this.connectedEmail = null;
      useSocketStore.getState().setPhase("connected", "Back online");
      if (this.user?.email) {
        this.emitConnectUser();
      }
    });

    socket.on("disconnect", () => {
      this.connectedEmail = null;
      useSocketStore.getState().setPhase("disconnected");
    });

    socket.on("connect_error", () => {
      useSocketStore.getState().setError("Unable to reach chat server");
    });

    socket.on("user_connected", () => {
      useSocketStore.getState().setPhase("syncing");
      this.fetchConversations();
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

    socket.on("all_messages", (data) => {
      this.clearMsgTimeout();
      this.msgsLoading = false;
      useMessageStore.getState().setMessages(data);
    });

    socket.on("all_messages:error", () => {
      this.clearMsgTimeout();
      this.msgsLoading = false;
      const roomId =
        this.pendingFetchRoomId ?? useMessageStore.getState().activeRoomId;
      if (roomId) {
        useMessageStore.getState().setLoadError(roomId, true);
      }
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
      const roomId =
        typeof data === "string"
          ? data
          : String((data as { roomId?: string })?.roomId ?? "");
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

  private clearMsgTimeout(): void {
    if (this.msgTimeout) {
      clearTimeout(this.msgTimeout);
      this.msgTimeout = null;
    }
    this.pendingFetchRoomId = null;
  }

  private emitConnectUser(): void {
    if (!this.user?.email || !this.socket) return;
    if (this.connectedEmail === this.user.email) return;

    useSocketStore.getState().setPhase("authenticating");
    this.connectedEmail = this.user.email;
    this.socket.emit("connect_user", { email: this.user.email });
  }

  fetchConversations(): void {
    if (!this.socket || !this.user || this.convosLoading) return;
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
    if (messages.length === 0) {
      this.fetchMessages(roomId);
    }
  }

  leaveConversation(): void {
    this.clearCurrentRoom();
  }

  fetchMessages(roomId: string, page = 0): void {
    if (!this.socket || !this.user || this.msgsLoading) return;
    this.msgsLoading = true;
    this.pendingFetchRoomId = roomId;
    useMessageStore.getState().setLoading(roomId, true);
    useMessageStore.getState().setLoadError(roomId, false);

    const pagination = useMessageStore.getState().getPagination(roomId);
    const payload =
      page > 0
        ? {
            roomId,
            currentPage: pagination.currentPage + 1,
            totalPages: pagination.totalPages,
            totalMessages: pagination.totalMessages,
            messages: [],
          }
        : {
            roomId,
            currentPage: 0,
            totalPages: 1,
            totalMessages: 0,
            messages: [],
          };

    this.socket.emit("get_all", { ...payload, userId: this.user._id });

    this.clearMsgTimeout();
    this.msgTimeout = setTimeout(() => {
      if (this.msgsLoading) {
        this.msgsLoading = false;
        useMessageStore.getState().setLoadError(roomId, true);
      }
    }, 6000);
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

  getUser(): GliceUser | null {
    return this.user;
  }
}

export const chatSocket = new ChatSocketService();
