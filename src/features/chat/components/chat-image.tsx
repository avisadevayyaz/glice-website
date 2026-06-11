"use client";

import { ImageIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { attachmentImageCandidates } from "../lib/pick-attachment-src";
import type { ChatAttachment } from "../types";
import { mediaDisplayCandidates, resolveMediaUrl } from "../lib/resolve-media-url";

type ChatImageProps = {
  src?: string | null;
  fallbackSrc?: string | null;
  attachment?: ChatAttachment;
  alt?: string;
  className?: string;
  onClick?: () => void;
  eager?: boolean;
};

function buildCandidates(
  src?: string | null,
  fallbackSrc?: string | null,
  attachment?: ChatAttachment,
): string[] {
  const fromAttachment = attachment ? attachmentImageCandidates(attachment) : [];
  const extra = [src, fallbackSrc].flatMap((u) => mediaDisplayCandidates(u));

  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of [...fromAttachment, ...extra]) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

export function ChatImage({
  src,
  fallbackSrc,
  attachment,
  alt = "",
  className,
  onClick,
  eager = false,
}: ChatImageProps) {
  const candidates = useMemo(
    () => buildCandidates(src, fallbackSrc, attachment),
    [src, fallbackSrc, attachment],
  );

  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const resolved = candidates[index] ?? "";
  const isBlob = resolved.startsWith("blob:");

  useEffect(() => {
    setIndex(0);
    setLoaded(false);
    setFailed(false);
  }, [candidates.join("|")]);

  if (!resolved || failed) {
    return (
      <span className={cn("chat-media-placeholder", className)}>
        <ImageIcon className="h-6 w-6 text-[var(--muted)]" />
      </span>
    );
  }

  const handleError = () => {
    if (index < candidates.length - 1) {
      setIndex((i) => i + 1);
      setLoaded(false);
      return;
    }
    setFailed(true);
  };

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt={alt}
      loading={eager || isBlob ? "eager" : "lazy"}
      decoding="async"
      className={cn(
        "chat-media-img transition-opacity duration-200",
        loaded || isBlob ? "opacity-100" : "opacity-0",
        className,
      )}
      onLoad={() => setLoaded(true)}
      onError={handleError}
    />
  );

  if (onClick) {
    return (
      <button
        type="button"
        className="chat-media-btn"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        {!loaded && !isBlob && (
          <span className="chat-media-placeholder absolute inset-0" />
        )}
        {img}
      </button>
    );
  }

  return (
    <span className="relative block">
      {!loaded && !isBlob && (
        <span className="chat-media-placeholder absolute inset-0" />
      )}
      {img}
    </span>
  );
}
