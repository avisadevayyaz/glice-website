"use client";

import { UserAvatar } from "@/components/chat/user-avatar";
import { cn } from "@/lib/utils";

type ChatTypingIndicatorProps = {
  name?: string;
  avatarUrl?: string;
  /** bubble = in-thread (Flutter TypingIndicator); inline = compact row */
  variant?: "bubble" | "inline";
  className?: string;
};

export function TypingDots({ size = "md" }: { size?: "sm" | "md" }) {
  const dot =
    size === "sm"
      ? "chat-typing-dot chat-typing-dot--sm"
      : "chat-typing-dot";

  return (
    <span className="chat-typing-dots" aria-hidden>
      <span className={dot} />
      <span className={dot} />
      <span className={dot} />
    </span>
  );
}

export function ChatTypingIndicator({
  name = "User",
  avatarUrl,
  variant = "bubble",
  className,
}: ChatTypingIndicatorProps) {
  if (variant === "inline") {
    return (
      <span className={cn("chat-typing-inline", className)}>
        <TypingDots size="sm" />
        <span>Typing…</span>
      </span>
    );
  }

  return (
    <div
      className={cn("chat-msg-row chat-msg-row--recv chat-typing-row", className)}
      role="status"
      aria-live="polite"
      aria-label={`${name} is typing`}
    >
      <div className="chat-typing-bubble">
        <UserAvatar name={name} url={avatarUrl} size="sm" />
        <TypingDots />
      </div>
    </div>
  );
}
