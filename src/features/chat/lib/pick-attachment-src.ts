import type { ChatAttachment } from "../types";
import {
  mediaDisplayCandidates,
  resolveMediaUrl,
} from "./resolve-media-url";

function isRemoteUrl(url?: string | null): boolean {
  if (!url?.trim()) return false;
  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("//") ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  );
}

/** All display URLs to try — Flutter order: thumbnail then url for images/videos. */
export function attachmentImageCandidates(attachment: ChatAttachment): string[] {
  const raw =
    attachment.type === "image" || attachment.type === "video"
      ? [attachment.thumbnail, attachment.url, attachment.localPreview]
      : [attachment.url, attachment.thumbnail, attachment.localPreview];

  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of raw) {
    for (const candidate of mediaDisplayCandidates(item)) {
      if (!candidate || seen.has(candidate)) continue;
      seen.add(candidate);
      out.push(candidate);
    }
  }

  return out;
}

export function pickAttachmentImageSrc(attachment: ChatAttachment): string {
  return attachmentImageCandidates(attachment)[0] ?? "";
}

export function pickAttachmentPreviewUrl(attachment: ChatAttachment): string {
  const url = resolveMediaUrl(attachment.url);
  const thumb = resolveMediaUrl(attachment.thumbnail);
  if (isRemoteUrl(url) && !url.startsWith("blob:")) return url;
  if (isRemoteUrl(thumb) && !thumb.startsWith("blob:")) return thumb;
  return pickAttachmentImageSrc(attachment);
}
