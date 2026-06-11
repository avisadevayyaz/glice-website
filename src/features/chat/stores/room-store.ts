import { create } from "zustand";
import { parseRoom } from "../lib/parsers";
import type { ChatRoom, MatchUser, RecentMessage } from "../types";

type RoomStore = {
  rooms: ChatRoom[];
  loading: boolean;
  currentRoomId: string;
  typingTimers: Record<string, ReturnType<typeof setTimeout>>;

  setAllRooms: (data: unknown) => void;
  setLoading: (loading: boolean) => void;
  enterRoom: (roomId: string) => void;
  exitRoom: () => void;
  getRoom: (roomId: string) => ChatRoom | undefined;
  addTyping: (roomId: string) => void;
  updateRoom: (params: {
    roomId: string;
    recentMessage?: RecentMessage;
    time?: Date;
    typing?: boolean;
    unsend?: boolean;
    isNew?: boolean;
    currentUserId?: string;
  }) => MatchUser | undefined;
  updateUnread: (roomId: string, unread?: number) => void;
  setStatus: (email: string, active: boolean, incognito: boolean) => void;
  removeRoom: (roomId: string) => void;
  addRoom: (data: unknown) => ChatRoom | undefined;
  reset: () => void;
};

function sortRooms(rooms: ChatRoom[]): ChatRoom[] {
  return [...rooms].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
  );
}

export const useRoomStore = create<RoomStore>((set, get) => ({
  rooms: [],
  loading: true,
  currentRoomId: "",
  typingTimers: {},

  setAllRooms: (data) => {
    try {
      if (!Array.isArray(data)) return;
      const rooms = data.map((item) =>
        parseRoom(item as Record<string, unknown>),
      );
      set({ rooms: sortRooms(rooms), loading: false });
    } catch {
      set({ loading: false });
    }
  },

  setLoading: (loading) => set({ loading }),

  enterRoom: (roomId) => set({ currentRoomId: roomId }),

  exitRoom: () => set({ currentRoomId: "" }),

  getRoom: (roomId) => get().rooms.find((r) => r.roomId === roomId),

  addTyping: (roomId) => {
    const { rooms, typingTimers } = get();
    const idx = rooms.findIndex((r) => r.roomId === roomId);
    if (idx === -1) return;

    const next = [...rooms];
    next[idx] = { ...next[idx], typing: true };
    set({ rooms: next });

    if (typingTimers[roomId]) clearTimeout(typingTimers[roomId]);
    const timer = setTimeout(() => {
      const state = get();
      const i = state.rooms.findIndex((r) => r.roomId === roomId);
      if (i === -1) return;
      const updated = [...state.rooms];
      updated[i] = { ...updated[i], typing: false };
      const timers = { ...state.typingTimers };
      delete timers[roomId];
      set({ rooms: updated, typingTimers: timers });
    }, 5000);

    set({ typingTimers: { ...typingTimers, [roomId]: timer } });
  },

  updateRoom: ({
    roomId,
    recentMessage,
    time,
    typing,
    unsend = false,
    isNew = true,
    currentUserId,
  }) => {
    const { rooms, currentRoomId, typingTimers } = get();
    const idx = rooms.findIndex((r) => r.roomId === roomId);
    if (idx === -1) return undefined;

    const room = rooms[idx];
    let unread = room.unread;

    const fromSelf = Boolean(
      currentUserId &&
        recentMessage?.sender &&
        recentMessage.sender === currentUserId,
    );

    if (roomId === currentRoomId) {
      unread = 0;
    } else if (isNew && !unsend && !fromSelf) {
      unread += 1;
    }

    if (typing != null && typingTimers[roomId]) {
      clearTimeout(typingTimers[roomId]);
      const timers = { ...typingTimers };
      delete timers[roomId];
      set({ typingTimers: timers });
    }

    const nextRecent =
      recentMessage ??
      (unsend
        ? { ...room.recentMessage, unsend: true }
        : room.recentMessage);

    const next = [...rooms];
    next[idx] = {
      ...room,
      recentMessage: nextRecent,
      timestamp: time ?? room.timestamp,
      typing: typing !== undefined ? typing : room.typing,
      unread,
    };

    set({ rooms: sortRooms(next) });
    return next[idx].otherUser;
  },

  updateUnread: (roomId, unread = 0) => {
    const { rooms } = get();
    const idx = rooms.findIndex((r) => r.roomId === roomId);
    if (idx === -1) return;
    const next = [...rooms];
    next[idx] = { ...next[idx], unread };
    set({ rooms: next });
  },

  setStatus: (email, active, incognito) => {
    const { rooms } = get();
    const idx = rooms.findIndex((r) => r.otherUser.email === email);
    if (idx === -1) return;
    const next = [...rooms];
    next[idx] = {
      ...next[idx],
      otherUser: {
        ...next[idx].otherUser,
        isActive: active,
        isIncognito: incognito,
      },
    };
    set({ rooms: next });
  },

  removeRoom: (roomId) => {
    const { rooms } = get();
    set({ rooms: rooms.filter((r) => r.roomId !== roomId) });
  },

  addRoom: (data) => {
    try {
      const room = parseRoom(data as Record<string, unknown>);
      const { rooms } = get();
      if (rooms.some((r) => r.roomId === room.roomId)) {
        return get().getRoom(room.roomId);
      }
      set({ rooms: sortRooms([...rooms, room]) });
      return room;
    } catch {
      return undefined;
    }
  },

  reset: () => {
    const { typingTimers } = get();
    Object.values(typingTimers).forEach(clearTimeout);
    set({
      rooms: [],
      loading: true,
      currentRoomId: "",
      typingTimers: {},
    });
  },
}));
