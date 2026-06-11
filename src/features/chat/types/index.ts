export type MessageStatus = "sending" | "delivered" | "read" | "deleted";

export type AttachmentType = "image" | "video" | "audio";

export type ChatAttachment = {
  id: string;
  url: string;
  thumbnail: string;
  type: AttachmentType;
  size: number;
  title: string;
  userId: string;
  pinned: boolean;
  isAdult: boolean;
  /** Client-only blob preview while uploading */
  localPreview?: string;
  /** Client-only upload progress 0–100 */
  uploadProgress?: number;
  /** Recorded / known voice length in seconds (shown before metadata loads) */
  audioDurationSec?: number;
};

export type ChatMessage = {
  id: string;
  roomId: string;
  sender: string;
  recipient: string;
  text: string;
  timestamp: Date;
  status: MessageStatus;
  attachment?: ChatAttachment;
};

export type RecentMessage = {
  sender: string;
  unsend: boolean;
  text: string;
};

export type MatchUser = {
  uid: string;
  email: string;
  name: string;
  username: string;
  profileUrl: string;
  age: number;
  gender: string;
  isActive: boolean;
  isIncognito: boolean;
  bio: string;
  location: {
    type: string;
    coordinates: [number, number];
    text: string;
  };
};

export type ChatRoom = {
  roomId: string;
  otherUser: MatchUser;
  users: Record<string, unknown>;
  recentMessage: RecentMessage;
  timestamp: Date;
  unread: number;
  typing: boolean;
};

export type PaginatedMessages = {
  roomId: string;
  messages: ChatMessage[];
  totalMessages: number;
  currentPage: number;
  totalPages: number;
};

export type ScrollEvent = "animate" | "jump" | "none";

export type SocketConnectionPhase =
  | "idle"
  | "connecting"
  | "connected"
  | "authenticating"
  | "syncing"
  | "ready"
  | "success"
  | "reconnecting"
  | "disconnected"
  | "error";

export type UserLocation = {
  type: "Point";
  coordinates: [number, number];
  text: string;
};
