"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { resolveDisplayMediaUrl, resolveMediaUrl } from "../lib/resolve-media-url";

type ImagePreviewModalProps = {
  url: string | null;
  onClose: () => void;
};

export function ImagePreviewModal({ url, onClose }: ImagePreviewModalProps) {
  const resolved = resolveDisplayMediaUrl(resolveMediaUrl(url));
  const open = Boolean(resolved);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="chat-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      onClick={onClose}
    >
      <button
        type="button"
        className="chat-lightbox-close"
        onClick={onClose}
        aria-label="Close preview"
      >
        <X className="h-5 w-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolved}
        alt="Full size preview"
        className="chat-lightbox-img"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
