"use client";

import { ChatConversation, ChatConversationContent } from "@/components/chat/conversation";

type ConversationThreadSkeletonProps = {
  onBack?: () => void;
};

export function ConversationThreadSkeleton({
  onBack,
}: ConversationThreadSkeletonProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--hair)] px-4 py-3">
        {onBack && (
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-[var(--surface-2)]" />
        )}
        <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-[var(--surface-2)]" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3.5 w-28 animate-pulse rounded bg-[var(--surface-2)]" />
          <div className="h-3 w-20 animate-pulse rounded bg-[var(--surface-2)]" />
        </div>
      </div>

      <ChatConversation className="flex-1">
        <ChatConversationContent className="chat-conversation-scroll px-4 py-5">
          <div className="mx-auto mb-6 h-3 w-40 animate-pulse rounded bg-[var(--surface-2)]" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`flex ${i % 2 ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="h-10 animate-pulse rounded-2xl bg-[var(--surface-2)]"
                  style={{ width: `${38 + (i % 3) * 14}%`, maxWidth: 300 }}
                />
              </div>
            ))}
          </div>
        </ChatConversationContent>
      </ChatConversation>

      <div className="chat-composer-bar">
        <div className="h-12 animate-pulse rounded-full bg-[var(--surface-2)]" />
      </div>
    </div>
  );
}
