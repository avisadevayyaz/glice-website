export type TempMessagePayload = {
  senderId: string;
  receiverId: string;
  message: string;
  otherUserName?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function parseTempMessagePayload(raw: unknown): TempMessagePayload | null {
  let source = raw;

  if (typeof raw === "string") {
    try {
      source = JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }

  const record = asRecord(source);
  if (!record) return null;

  const nested = asRecord(record.data) ?? asRecord(record.payload);
  const map = nested ?? record;

  const message = String(map.message ?? map.text ?? map.content ?? "").trim();
  if (!message) return null;

  const senderId = String(
    map.senderId ?? map.sender ?? map.userId ?? map.from ?? "",
  );
  const receiverId = String(
    map.receiverId ?? map.receiver ?? map.to ?? "",
  );

  return {
    senderId,
    receiverId,
    message,
    otherUserName:
      typeof map.otherUserName === "string" ? map.otherUserName : undefined,
  };
}
