"use client";

import { ChatConversation, ChatConversationContent } from "@/components/chat/conversation";
import { ChatTypingIndicator } from "@/components/chat/typing-indicator";
import { useUiSession } from "@/components/site/ui-session-provider";
import { useCallback, useEffect, useState } from "react";
import { useMessageScroll } from "../hooks/use-message-scroll";
import { DEFAULT_PAGINATION, EMPTY_MESSAGES } from "../lib/constants";
import { chatSocket } from "../services/socket-service";
import { useMessageStore } from "../stores/message-store";
import { useRoomStore } from "../stores/room-store";
import { ConversationHeader } from "./conversation-header";
import { ImagePreviewModal } from "./image-preview-modal";
import { MessageBubble } from "./message-bubble";
import { MessageComposer } from "./message-composer";
import { SecurityTips } from "./security-tips";
import { ConversationThreadSkeleton } from "./conversation-thread-skeleton";
import { useSocketStore } from "../stores/socket-store";

type ConversationViewProps = {
  roomId: string;
  onBack?: () => void;
};

export function ConversationView({ roomId, onBack }: ConversationViewProps) {
  const { user } = useUiSession();
  const room = useRoomStore((s) => s.rooms.find((r) => r.roomId === roomId));
  const roomsLoading = useRoomStore((s) => s.loading);
  const socketPhase = useSocketStore((s) => s.phase);
  const messages = useMessageStore((s) => s.cache[roomId] ?? EMPTY_MESSAGES);
  const isLoading = useMessageStore((s) => Boolean(s.messagesLoading[roomId]));
  const loadError = useMessageStore((s) => Boolean(s.loadError[roomId]));
  const pagination = useMessageStore(
    (s) => s.pagination[roomId] ?? DEFAULT_PAGINATION,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    chatSocket.enterConversation(roomId);
    return () => chatSocket.leaveConversation();
  }, [roomId, user?._id]);

  const { scrollRef, beforeLoadMore } = useMessageScroll({
    roomId,
    messages,
    userId: user?._id,
    typing: room?.typing ?? false,
    isLoading,
  });

  const loadMore = useCallback(() => {
    const el = scrollRef.current;
    if (!el || isLoading) return;
    if (el.scrollTop > 80) return;
    if (pagination.currentPage >= pagination.totalPages) return;
    beforeLoadMore();
    chatSocket.fetchMessages(roomId, pagination.currentPage + 1);
  }, [roomId, isLoading, pagination, beforeLoadMore, scrollRef]);

  const isHydrating =
    roomsLoading ||
    socketPhase === "connecting" ||
    socketPhase === "authenticating" ||
    socketPhase === "syncing" ||
    socketPhase === "reconnecting";

  if (!room && isHydrating) {
    return <ConversationThreadSkeleton onBack={onBack} />;
  }

  if (!room) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <p className="text-sm text-[var(--muted)]">Conversation not found.</p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="rounded-full px-4 py-2 text-sm font-medium"
            style={{ border: "1px solid var(--hair)" }}
          >
            Back
          </button>
        )}
      </div>
    );
  }

  const handleUnsend = (messageId: string) => {
    chatSocket.unsendMessage({
      recipientEmail: room.otherUser.email,
      messageId,
      roomId: room.roomId,
      updateText: "Message unsent",
    });
    const isLast = useMessageStore
      .getState()
      .deleteMessage(room.roomId, messageId, true);
    if (isLast) {
      useRoomStore.getState().updateRoom({ roomId: room.roomId, unsend: true });
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ConversationHeader room={room} onBack={onBack} />

      <ChatConversation className="flex-1">
        <ChatConversationContent
          ref={scrollRef}
          onScroll={loadMore}
          className={`chat-conversation-scroll${room.typing ? " chat-conversation-scroll--typing" : ""}`}
        >
          <p className="chat-paired-divider">
            Paired with {room.otherUser.name}
          </p>

          <SecurityTips />

          {isLoading && pagination.currentPage > 0 && (
            <div className="flex justify-center py-2">
              <span className="text-xs text-[var(--muted)]">Loading…</span>
            </div>
          )}

          {loadError && messages.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12">
              <p className="text-sm text-[var(--muted)]">
                Couldn&apos;t load messages.
              </p>
              <button
                type="button"
                onClick={() => chatSocket.fetchMessages(roomId)}
                className="rounded-full px-4 py-2 text-sm font-semibold"
                style={{ background: "var(--primary)", color: "#0a0f0d" }}
              >
                Retry
              </button>
            </div>
          )}

          {isLoading && messages.length === 0 && !loadError && (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex ${i % 2 ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className="h-10 animate-pulse rounded-2xl bg-[var(--surface-2)]"
                    style={{ width: `${40 + (i % 3) * 15}%`, maxWidth: 280 }}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex w-full flex-col">
            {messages.map((message, index) => {
              const isSentByMe = message.sender === user?._id;
              const isLastSame =
                index < messages.length - 1 &&
                messages[index + 1].sender === message.sender;

              return (
                <MessageBubble
                  key={message.id || `${message.timestamp.getTime()}-${index}`}
                  message={message}
                  isSentByMe={isSentByMe}
                  isLastSame={isLastSame}
                  loading={message.status === "sending"}
                  onUnsend={
                    isSentByMe && message.status !== "deleted"
                      ? () => handleUnsend(message.id)
                      : undefined
                  }
                  onImageClick={setPreviewUrl}
                />
              );
            })}
          </div>

          {room.typing && (
            <ChatTypingIndicator
              name={room.otherUser.name}
              avatarUrl={room.otherUser.profileUrl}
            />
          )}
        </ChatConversationContent>
      </ChatConversation>

      {room.typing && (
        <div className="chat-typing-mobile-bar md:hidden" role="status" aria-live="polite">
          <ChatTypingIndicator
            name={room.otherUser.name}
            avatarUrl={room.otherUser.profileUrl}
            variant="inline"
          />
        </div>
      )}

      <MessageComposer room={room} />
      <ImagePreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />
    </div>
  );
}
