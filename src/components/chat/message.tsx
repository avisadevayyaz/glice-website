"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function ChatMessage({
  className,
  from,
  compact,
  children,
  onContextMenu,
}: {
  from: "user" | "assistant";
  compact?: boolean;
  className?: string;
  children: React.ReactNode;
  onContextMenu?: React.MouseEventHandler<HTMLDivElement>;
}) {
  return (
    <div
      className={cn(
        "chat-msg-row",
        from === "user" ? "chat-msg-row--sent" : "chat-msg-row--recv",
        compact && "chat-msg-row--compact",
        className,
      )}
      onContextMenu={onContextMenu}
    >
      {children}
    </div>
  );
}

export function ChatBubble({
  from,
  media,
  className,
  children,
}: {
  from: "user" | "assistant";
  media?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "chat-bubble",
        from === "user" ? "chat-bubble--sent" : "chat-bubble--recv",
        media && "chat-bubble--media",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ChatMessageMeta({
  sent,
  className,
  children,
}: {
  sent?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "chat-msg-meta",
        sent && "chat-msg-meta--sent",
        className,
      )}
    >
      {children}
    </div>
  );
}
