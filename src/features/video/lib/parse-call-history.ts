import type {
  PaginatedRandomCallHistory,
  RandomCallEntry,
  RandomCallFilter,
} from "../types";

function parseFilter(value: unknown, fallback: RandomCallFilter): RandomCallFilter {
  const raw = String(value ?? fallback).toLowerCase();
  if (raw === "all") return "all";
  if (raw === "random") return "random";
  if (raw === "spark" || raw === "spark_dating" || raw === "sparkdating") {
    return "spark";
  }
  return fallback;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function unwrapPayload(json: unknown): Record<string, unknown> {
  const root = asRecord(json);
  if (!root) return {};

  const body = asRecord(root.body);
  if (body) {
    const bodyData = asRecord(body.data);
    if (bodyData) return bodyData;
    return body;
  }

  const data = asRecord(root.data);
  if (data) return data;

  return root;
}

function readPartner(json: Record<string, unknown>): Record<string, unknown> {
  const candidates = [
    json.user,
    json.partner,
    json.otherUser,
    json.matchedUser,
    json.profile,
    json.caller,
    json.receiver,
  ];

  for (const candidate of candidates) {
    const record = asRecord(candidate);
    if (record) return record;
  }

  if (json._id || json.id || json.uid) {
    return json;
  }

  return {};
}

function readLocationText(json: Record<string, unknown>): string {
  const loc = asRecord(json.location);
  if (!loc) return "";
  return String(loc.text ?? loc.city ?? loc.address ?? "").trim();
}

function parsePartner(json: Record<string, unknown>) {
  let name = String(json.name ?? json.otherUserName ?? json.username ?? "Someone");
  if (name.length > 0) {
    name = name.charAt(0).toUpperCase() + name.slice(1);
  }

  const interests = Array.isArray(json.interests)
    ? json.interests.map((item) => String(item)).filter(Boolean)
    : [];

  return {
    id: String(json._id ?? json.id ?? json.uid ?? ""),
    name,
    username: String(json.username ?? "") || undefined,
    profileUrl: String(json.profileUrl ?? json.otherUserProfilePic ?? ""),
    distance: readLocationText(json) || String(json.distance ?? ""),
    age: Number(json.age ?? 0) || undefined,
    gender: String(json.gender ?? "") || undefined,
    bio: String(json.bio ?? "") || undefined,
    interests: interests.length > 0 ? interests : undefined,
    isActive: Boolean(json.active ?? json.isActive ?? false),
  };
}

function normalizeUserRow(item: Record<string, unknown>): Record<string, unknown> {
  const user = asRecord(item.user);
  if (!user) return item;

  return {
    ...user,
    ...item,
    user,
    partner: user,
  };
}

function readEntries(payload: Record<string, unknown>): Record<string, unknown>[] {
  const lists = [
    payload.users,
    payload.calls,
    payload.history,
    payload.items,
    payload.results,
    payload.activities,
    payload.activity,
    payload.data,
  ];

  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    return list
      .map((item) => asRecord(item))
      .filter((item): item is Record<string, unknown> => item !== null)
      .map(normalizeUserRow);
  }

  if (Array.isArray(payload)) {
    return payload
      .map((item) => asRecord(item))
      .filter((item): item is Record<string, unknown> => item !== null)
      .map(normalizeUserRow);
  }

  return [];
}

export function parseRandomCallEntry(json: Record<string, unknown>): RandomCallEntry {
  const partner = parsePartner(readPartner(json));
  const durationSec = Number(
    json.duration ??
      json.durationSec ??
      json.callDuration ??
      json.timeSpent ??
      0,
  );

  const callType = parseFilter(json.type ?? json.callType ?? json.category, "random");

  const likedRaw = json.liked ?? json.isLiked ?? json.feedback ?? json.thumbsUp;
  const liked =
    likedRaw === true ||
    likedRaw === 1 ||
    likedRaw === "true" ||
    likedRaw === "liked";

  return {
    id: String(
      json._id ??
        json.id ??
        `${partner.id}-${json.createdAt ?? json.timestamp ?? Date.now()}`,
    ),
    partner,
    durationSec,
    timestamp: new Date(
      String(
        json.timestamp ??
          json.createdAt ??
          json.startedAt ??
          json.endedAt ??
          Date.now(),
      ),
    ),
    distance: String(json.distance ?? partner.distance ?? "") || undefined,
    liked,
    callType,
  };
}

export function parsePaginatedRandomCallHistory(
  json: unknown,
  requestedType: RandomCallFilter,
): PaginatedRandomCallHistory {
  const payload = unwrapPayload(json);
  const entries = readEntries(payload).map(parseRandomCallEntry);

  return {
    type: parseFilter(payload.type, requestedType),
    entries,
    totalCalls: Number(
      payload.totalCalls ??
        payload.totalActivities ??
        payload.total ??
        entries.length,
    ),
    currentPage: Math.max(1, Number(payload.currentPage ?? 1)),
    totalPages: Math.max(1, Number(payload.totalPages ?? 1)),
  };
}
