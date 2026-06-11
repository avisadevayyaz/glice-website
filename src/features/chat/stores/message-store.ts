import { create } from "zustand";
import { parseMessage, parsePaginatedMessages } from "../lib/parsers";
import type { ChatAttachment, ChatMessage, ScrollEvent } from "../types";

type MessageUpdatePatch = Omit<Partial<ChatMessage>, "attachment"> & {
  attachment?: Partial<ChatAttachment>;
};

type MessageStore = {
  cache: Record<string, ChatMessage[]>;
  pagination: Record<
    string,
    { currentPage: number; totalPages: number; totalMessages: number }
  >;
  activeRoomId: string;
  scrollEvent: ScrollEvent;
  messagesLoading: Record<string, boolean>;
  loadError: Record<string, boolean>;

  getMessages: (roomId: string) => ChatMessage[];
  getPagination: (roomId: string) => {
    currentPage: number;
    totalPages: number;
    totalMessages: number;
  };
  isLoading: (roomId: string) => boolean;
  hasLoadError: (roomId: string) => boolean;
  setMessages: (data: unknown) => void;
  addMessage: (data: unknown, update?: boolean) => ChatMessage;
  updateMessageId: (data: Record<string, unknown>) => void;
  updateMessage: (
    roomId: string,
    messageId: string,
    patch: MessageUpdatePatch,
  ) => void;
  deleteMessage: (
    roomId: string,
    messageId: string,
    unsend?: boolean,
  ) => boolean;
  deleteRoom: (roomId: string) => void;
  setLoading: (roomId: string, loading: boolean) => void;
  setLoadError: (roomId: string, error: boolean) => void;
  setActiveRoom: (roomId: string) => void;
  clearScrollEvent: () => void;
  reset: () => void;
};

function emit(
  set: (partial: Partial<MessageStore>) => void,
  roomId: string,
  scrollEvent: ScrollEvent = "animate",
) {
  set({ activeRoomId: roomId, scrollEvent });
}

function isRemoteMediaUrl(url?: string): boolean {
  return Boolean(url?.startsWith("http://") || url?.startsWith("https://"));
}

function mergeAttachments(
  prev: ChatAttachment | undefined,
  next: ChatAttachment | undefined,
): ChatAttachment | undefined {
  if (!next) return prev;
  if (!prev) return next;

  const pick = (a?: string, b?: string) => {
    const aRemote = isRemoteMediaUrl(a);
    const bRemote = isRemoteMediaUrl(b);
    if (aRemote && !bRemote) return a!;
    if (bRemote && !aRemote) return b!;
    if (b?.trim()) return b;
    return a ?? "";
  };

  const url = pick(prev.url, next.url);
  const thumbnail = pick(prev.thumbnail, next.thumbnail) || url;

  return {
    ...prev,
    ...next,
    url,
    thumbnail,
    type: next.type || prev.type,
    localPreview: next.localPreview ?? prev.localPreview,
    uploadProgress: next.uploadProgress ?? prev.uploadProgress,
  };
}

export const useMessageStore = create<MessageStore>((set, get) => ({
  cache: {},
  pagination: {},
  activeRoomId: "",
  scrollEvent: "none",
  messagesLoading: {},
  loadError: {},

  getMessages: (roomId) => get().cache[roomId] ?? [],

  getPagination: (roomId) =>
    get().pagination[roomId] ?? {
      currentPage: 0,
      totalPages: 1,
      totalMessages: 0,
    },

  isLoading: (roomId) => Boolean(get().messagesLoading[roomId]),

  hasLoadError: (roomId) => Boolean(get().loadError[roomId]),

  setMessages: (data) => {
    const parsed = parsePaginatedMessages(data as Record<string, unknown>);
    const roomId = parsed.roomId;
    const reversed = [...parsed.messages].reverse();
    const existing = get().cache[roomId] ?? [];

    const isPrepend = existing.length > 0 && parsed.currentPage !== 1;
    const merged = isPrepend ? [...reversed, ...existing] : reversed;
    const scrollEvent: ScrollEvent = isPrepend
      ? "none"
      : merged.length > 0
        ? "jump"
        : "none";

    set({
      cache: { ...get().cache, [roomId]: merged },
      pagination: {
        ...get().pagination,
        [roomId]: {
          currentPage: parsed.currentPage,
          totalPages: parsed.totalPages,
          totalMessages: parsed.totalMessages,
        },
      },
      messagesLoading: { ...get().messagesLoading, [roomId]: false },
      loadError: { ...get().loadError, [roomId]: false },
    });
    emit(set, roomId, scrollEvent);
  },

  addMessage: (data, update = false) => {
    const raw =
      data && typeof data === "object"
        ? (data as Record<string, unknown>)
        : ({} as Record<string, unknown>);

    const message =
      data && typeof data === "object" && "roomId" in (data as object)
        ? (data as ChatMessage).timestamp instanceof Date
          ? (data as ChatMessage)
          : parseMessage(raw)
        : parseMessage(raw);

    const roomId = message.roomId;
    const list = [...(get().cache[roomId] ?? [])];

    const clientId = String(raw.id ?? "");
    const serverId = String(raw._id ?? "");
    const ids = new Set(
      [message.id, clientId, serverId].filter(Boolean),
    );

    let existingIdx = list.findIndex((m) => ids.has(m.id));

    if (existingIdx === -1 && message.sender) {
      const ts = message.timestamp.getTime();
      if (message.text) {
        existingIdx = list.findIndex(
          (m) =>
            m.sender === message.sender &&
            m.text === message.text &&
            Math.abs(m.timestamp.getTime() - ts) < 3000,
        );
      }
      if (existingIdx === -1 && message.attachment?.url) {
        const url = message.attachment.url;
        existingIdx = list.findIndex(
          (m) =>
            m.sender === message.sender &&
            (m.attachment?.url === url ||
              m.attachment?.localPreview === url) &&
            Math.abs(m.timestamp.getTime() - ts) < 8000,
        );
      }
    }

    if (existingIdx !== -1) {
      const attachment = mergeAttachments(
        list[existingIdx].attachment,
        message.attachment,
      );
      if (attachment && isRemoteMediaUrl(attachment.url)) {
        delete attachment.localPreview;
        delete attachment.uploadProgress;
      }
      const merged: ChatMessage = {
        ...list[existingIdx],
        ...message,
        attachment,
      };
      if (
        merged.attachment &&
        list[existingIdx].attachment?.audioDurationSec &&
        !merged.attachment.audioDurationSec
      ) {
        merged.attachment = {
          ...merged.attachment,
          audioDurationSec: list[existingIdx].attachment!.audioDurationSec,
        };
      }
      if (serverId && merged.id !== serverId) {
        merged.id = serverId;
      }
      list[existingIdx] = merged;
      set({ cache: { ...get().cache, [roomId]: list } });
      emit(set, roomId, "none");
      return merged;
    }

    if (update) {
      const idx = list.findIndex((m) => m.id === message.id);
      if (idx !== -1) list.splice(idx, 1);
    }

    list.push(message);
    set({ cache: { ...get().cache, [roomId]: list } });
    emit(set, roomId, "animate");
    return message;
  },

  updateMessageId: (data) => {
    const roomId = String(data.roomId ?? "");
    const oldId = String(data.oldId ?? "");
    const newId = String(data.newId ?? "");
    const list = [...(get().cache[roomId] ?? [])];
    const idx = list.findIndex((m) => m.id === oldId);
    if (idx === -1) return;
    list[idx] = { ...list[idx], id: newId };
    set({ cache: { ...get().cache, [roomId]: list } });
    emit(set, roomId, "none");
  },

  updateMessage: (roomId, messageId, patch) => {
    const list = [...(get().cache[roomId] ?? [])];
    const idx = list.findIndex((m) => m.id === messageId);
    if (idx === -1) return;
    const current = list[idx];
    const { attachment: attachmentPatch, ...rest } = patch;
    const next: ChatMessage = { ...current, ...rest };
    if (attachmentPatch) {
      const merged = mergeAttachments(current.attachment, {
        ...(current.attachment ?? ({} as ChatAttachment)),
        ...attachmentPatch,
      });
      if (merged && isRemoteMediaUrl(merged.url)) {
        delete merged.localPreview;
        delete merged.uploadProgress;
      }
      next.attachment = merged;
    }
    list[idx] = next;
    set({ cache: { ...get().cache, [roomId]: list } });
    emit(set, roomId, "none");
  },

  deleteMessage: (roomId, messageId, unsend = false) => {
    const list = [...(get().cache[roomId] ?? [])];
    let idx = -1;

    if (unsend) {
      idx = list.findIndex((m) => m.id === messageId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], status: "deleted" };
      }
    } else {
      const filtered = list.filter((m) => m.id !== messageId);
      idx = list.findIndex((m) => m.id === messageId);
      set({ cache: { ...get().cache, [roomId]: filtered } });
      emit(set, roomId, "none");
      return idx === list.length - 1;
    }

    set({ cache: { ...get().cache, [roomId]: list } });
    emit(set, roomId, "none");
    return idx === list.length - 1;
  },

  deleteRoom: (roomId) => {
    const cache = { ...get().cache };
    const pagination = { ...get().pagination };
    const messagesLoading = { ...get().messagesLoading };
    const loadError = { ...get().loadError };
    delete cache[roomId];
    delete pagination[roomId];
    delete messagesLoading[roomId];
    delete loadError[roomId];
    set({ cache, pagination, messagesLoading, loadError, activeRoomId: "" });
  },

  setLoading: (roomId, loading) => {
    set({
      messagesLoading: { ...get().messagesLoading, [roomId]: loading },
      loadError: loading
        ? { ...get().loadError, [roomId]: false }
        : get().loadError,
    });
  },

  setLoadError: (roomId, error) => {
    set({
      loadError: { ...get().loadError, [roomId]: error },
      messagesLoading: { ...get().messagesLoading, [roomId]: false },
    });
  },

  setActiveRoom: (roomId) => set({ activeRoomId: roomId }),

  clearScrollEvent: () => set({ scrollEvent: "none" }),

  reset: () =>
    set({
      cache: {},
      pagination: {},
      activeRoomId: "",
      scrollEvent: "none",
      messagesLoading: {},
      loadError: {},
    }),
}));
