import type {
  AttachmentType,
  ChatAttachment,
  ChatMessage,
  ChatRoom,
  MatchUser,
  MessageStatus,
  PaginatedMessages,
  RecentMessage,
  UserLocation,
} from "../types";
import { normalizeMediaUrlString } from "./resolve-media-url";

function parseMessageStatus(status: string): MessageStatus {
  switch (status) {
    case "delivered":
      return "delivered";
    case "deleted":
      return "deleted";
    case "read":
      return "read";
    default:
      return "sending";
  }
}

function parseAttachmentType(type: string): AttachmentType {
  switch (type) {
    case "video":
      return "video";
    case "audio":
      return "audio";
    default:
      return "image";
  }
}

function readMediaUrl(json: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const val = json[key];
    if (typeof val === "string" && val.trim()) {
      return normalizeMediaUrlString(val);
    }
  }
  return "";
}

function extractAttachmentRaw(
  json: Record<string, unknown>,
): Record<string, unknown> | string | null {
  const att = json.attachment;
  if (att == null) {
    const rootType = json.type;
    const rootUrl = readMediaUrl(
      json,
      "url",
      "publicUrl",
      "fileUrl",
      "path",
      "src",
    );
    if (
      typeof rootType === "string" &&
      rootUrl &&
      ["image", "video", "audio"].includes(rootType)
    ) {
      return {
        type: rootType,
        url: rootUrl,
        thumbnail: readMediaUrl(
          json,
          "thumbnail",
          "thumbUrl",
          "thumbnailUrl",
          "previewUrl",
          "thumb",
        ),
        id: json.attachmentId ?? json._id ?? json.id,
        userId: json.userId,
        size: json.size,
        title: json.title,
        pinned: json.pinned,
        isAdult: json.isAdult,
      };
    }
    return null;
  }
  if (typeof att === "string" && att.trim()) {
    return { url: att.trim(), thumbnail: att.trim(), type: "image" };
  }
  if (typeof att === "object" && !Array.isArray(att)) {
    const map = att as Record<string, unknown>;
    if (map.url == null && map.thumbnail == null && map.publicUrl != null) {
      const publicUrl = readMediaUrl(map, "publicUrl");
      return { ...map, url: publicUrl, thumbnail: publicUrl };
    }
    return map;
  }
  return null;
}

export function parseAttachment(
  json: Record<string, unknown>,
): ChatAttachment | undefined {
  const url = readMediaUrl(json, "url", "publicUrl", "fileUrl", "path", "src");
  const thumbnail = readMediaUrl(
    json,
    "thumbnail",
    "thumbUrl",
    "thumbnailUrl",
    "previewUrl",
    "thumb",
  );

  const resolvedUrl = url || thumbnail;
  const resolvedThumb = thumbnail || url;
  if (!resolvedUrl && !resolvedThumb) return undefined;

  return {
    id: String(json._id ?? json.id ?? ""),
    url: resolvedUrl,
    thumbnail: resolvedThumb,
    type: parseAttachmentType(String(json.type ?? "image")),
    size: Number(json.size ?? 0),
    title: String(json.title ?? "Chat"),
    userId: String(json.userId ?? ""),
    pinned: Boolean(json.pinned ?? false),
    isAdult: Boolean(json.isAdult ?? false),
  };
}

export function parseMessage(json: Record<string, unknown>): ChatMessage {
  const rawAtt = extractAttachmentRaw(json);
  const attachment =
    rawAtt == null
      ? undefined
      : typeof rawAtt === "string"
        ? parseAttachment({ url: rawAtt, thumbnail: rawAtt, type: "image" })
        : parseAttachment(rawAtt);

  return {
    id: String(json.id ?? json._id ?? ""),
    roomId: String(json.roomId ?? ""),
    sender: String(json.sender ?? ""),
    recipient: String(json.recipient ?? ""),
    text: String(json.text ?? ""),
    timestamp: new Date(String(json.timestamp ?? Date.now())),
    status: parseMessageStatus(String(json.status ?? "sending")),
    attachment,
  };
}

export function parseRecentMessage(
  json: Record<string, unknown> | string,
): RecentMessage {
  if (typeof json === "string") {
    return { sender: "Glice", unsend: false, text: json };
  }
  return {
    sender: String(json.sender ?? "Glice"),
    unsend: Boolean(json.unsend ?? false),
    text: String(json.text ?? "You paired!"),
  };
}

export function parseMatchUser(json: Record<string, unknown>): MatchUser {
  const loc = (json.location ?? {}) as Record<string, unknown>;
  const coords = Array.isArray(loc.coordinates)
    ? (loc.coordinates as number[])
    : [0, 0];

  let name = String(json.name ?? "");
  if (name.length > 0) {
    name = name.charAt(0).toUpperCase() + name.slice(1);
  }

  return {
    uid: String(json._id ?? ""),
    email: String(json.email ?? ""),
    name,
    username: String(json.username ?? ""),
    profileUrl: String(json.profileUrl ?? ""),
    age: Number(json.age ?? 18),
    gender: String(json.gender ?? "man"),
    isActive: Boolean(json.active ?? false),
    isIncognito: Boolean(json.isIncognito ?? false),
    bio: String(json.bio ?? ""),
    location: {
      type: String(loc.type ?? "Point"),
      coordinates: [coords[0] ?? 0, coords[1] ?? 0],
      text: String(loc.text ?? ""),
    },
  };
}

export function parseRoom(json: Record<string, unknown>): ChatRoom {
  const recent =
    json.recentMessage != null
      ? parseRecentMessage(
          json.recentMessage as Record<string, unknown> | string,
        )
      : { sender: "Glice", unsend: false, text: "You paired!" };

  return {
    roomId: String(json.roomId ?? ""),
    otherUser: parseMatchUser(
      (json.otherUser ?? {}) as Record<string, unknown>,
    ),
    users: (json.users ?? {}) as Record<string, unknown>,
    recentMessage: recent,
    timestamp: new Date(String(json.timestamp ?? Date.now())),
    unread: Number(json.unread ?? 0),
    typing: Boolean(json.typing ?? false),
  };
}

export function parsePaginatedMessages(
  json: Record<string, unknown>,
): PaginatedMessages {
  const messages = Array.isArray(json.messages)
    ? (json.messages as Record<string, unknown>[]).map(parseMessage)
    : [];

  return {
    roomId: String(json.roomId ?? ""),
    messages,
    totalMessages: Number(json.totalMessages ?? 0),
    currentPage: Number(json.currentPage ?? 0),
    totalPages: Number(json.totalPages ?? 1),
  };
}

/** Mirrors GliceFlutter Attachment.toJson() field-for-field */
export function attachmentToPayload(
  att: ChatAttachment,
): Record<string, unknown> {
  const url = att.url?.startsWith("blob:")
    ? ""
    : normalizeMediaUrlString(att.url);
  const thumbnail = att.thumbnail?.startsWith("blob:")
    ? ""
    : normalizeMediaUrlString(att.thumbnail || url);

  return {
    id: att.id ?? "",
    url,
    size: att.size ?? 0,
    title: att.title ?? "Chat",
    pinned: att.pinned ?? false,
    userId: att.userId,
    type: att.type,
    thumbnail: thumbnail || url,
    verificationStatus: "approved",
    isAdult: att.isAdult ?? false,
  };
}

/** Mirrors GliceFlutter MessageModel.toJson() field-for-field */
export function messageToPayload(message: ChatMessage): Record<string, unknown> {
  const att = message.attachment;
  return {
    timestamp: message.timestamp.toISOString(),
    attachment: att ? attachmentToPayload(att) : null,
    status: message.status,
    recipient: message.recipient,
    sender: message.sender,
    roomId: message.roomId,
    text: message.text,
    id: message.id,
  };
}

export function isPersistableMediaAttachment(
  att: ChatAttachment | undefined,
): boolean {
  if (!att?.type) return false;
  const url = att.url?.trim() ?? "";
  return url.startsWith("http://") || url.startsWith("https://");
}

export function defaultLocation(): UserLocation {
  return { type: "Point", coordinates: [0, 0], text: "" };
}
