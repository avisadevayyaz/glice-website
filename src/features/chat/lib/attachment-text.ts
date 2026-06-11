import type { AttachmentType } from "../types";

/** Server/Flutter stores list-preview text in message.text — not a user caption. */
export function isSystemAttachmentText(
  text: string | undefined,
  type?: AttachmentType,
): boolean {
  const t = (text ?? "").trim().toLowerCase();
  if (!t) return false;

  const patterns = [
    "sent an image",
    "sent a video",
    "sent audio",
    "sent a voice",
    "ha inviato un immagine",
    "envió una imagen",
    "enviou uma imagem",
    "📷 photo",
    "🎥 video",
    "🔉 voice",
  ];

  if (patterns.some((p) => t.includes(p))) return true;
  if (/^[📷🎥🔉]/.test(t)) return true;

  if (type === "image" && (t === "photo" || t.includes("image"))) return true;
  if (type === "video" && t.includes("video")) return true;
  if (type === "audio" && (t.includes("voice") || t.includes("audio"))) {
    return true;
  }

  return false;
}

export function attachmentCaptionText(
  text: string | undefined,
  type?: AttachmentType,
): string {
  const trimmed = (text ?? "").trim();
  if (!trimmed || isSystemAttachmentText(trimmed, type)) return "";
  return trimmed;
}
