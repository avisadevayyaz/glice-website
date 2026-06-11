"use client";

import { CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatTypingIndicator } from "./typing-indicator";
import { UserAvatar } from "./user-avatar";

type ChatListItemProps = {
  name: string;
  avatarUrl?: string;
  preview: string;
  time: string;
  unread?: number;
  typing?: boolean;
  active?: boolean;
  isOnline?: boolean;
  isSentByMe?: boolean;
  onClick: () => void;
  onDelete?: () => void;
};

export function ChatListItem({
  name,
  avatarUrl,
  preview,
  time,
  unread = 0,
  typing = false,
  active = false,
  isOnline = false,
  isSentByMe = false,
  onClick,
  onDelete,
}: ChatListItemProps) {
  const unreadLabel = unread > 9 ? "9+" : String(unread);

  return (
    <button
      type="button"
      onClick={onClick}
      onContextMenu={(e) => {
        if (!onDelete) return;
        e.preventDefault();
        if (window.confirm(`Delete chat with ${name}?`)) onDelete();
      }}
      className={cn(
        "chat-list-item flex w-full items-center gap-3 px-3 py-3 text-left transition-colors",
        active && "chat-list-item--active",
      )}
    >
      <UserAvatar name={name} url={avatarUrl} isOnline={isOnline} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-semibold text-[var(--text)]">
            {name}
          </span>
          <span className="shrink-0 text-[11px] text-[var(--muted)]">
            {time}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span
            className={cn(
              "truncate text-[13px]",
              typing
                ? "font-medium text-[var(--primary)]"
                : unread > 0
                  ? "font-medium text-[var(--text)]"
                  : "text-[var(--muted)]",
            )}
          >
            {typing ? (
              <ChatTypingIndicator variant="inline" />
            ) : (
              preview
            )}
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            {!typing && unread === 0 && isSentByMe && (
              <CheckCheck className="h-3.5 w-3.5 text-[var(--primary)]" />
            )}
            {unread > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1.5 text-[10px] font-bold text-[#0a0f0d]">
                {unreadLabel}
              </span>
            )}
          </span>
        </div>
      </div>
    </button>
  );
}
