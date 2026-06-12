"use client";

import { UserAvatar } from "@/components/chat/user-avatar";
import {
  CHAT_TOAST_DURATION_MS,
  useNotificationStore,
} from "@/features/chat/stores/notification-store";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

export function ChatNotificationToasts() {
  const router = useRouter();
  const toast = useNotificationStore((s) => s.toasts[0] ?? null);
  const dismiss = useNotificationStore((s) => s.dismiss);

  const openRoom = useCallback(
    (toastId: string, roomId: string) => {
      dismiss(toastId);
      if (window.location.pathname.startsWith("/messages")) {
        window.dispatchEvent(
          new CustomEvent("glice-open-chat-room", { detail: { roomId } }),
        );
        return;
      }
      router.push(`/messages?room=${encodeURIComponent(roomId)}`);
    },
    [dismiss, router],
  );

  if (!toast) return null;

  return (
    <div className="chat-toast-stack" aria-live="polite" aria-label="New message">
      <article key={toast.id} className="chat-toast" role="status">
        <button
          type="button"
          className="chat-toast-main"
          onClick={() => openRoom(toast.id, toast.roomId)}
        >
          <UserAvatar
            name={toast.senderName}
            url={toast.senderAvatar}
            size="md"
            isOnline
          />
          <span className="chat-toast-copy">
            <span className="chat-toast-kicker">New message</span>
            <span className="chat-toast-title">{toast.senderName}</span>
            <span className="chat-toast-preview">{toast.preview}</span>
          </span>
        </button>
        <span
          className="chat-toast-progress"
          style={{ animationDuration: `${CHAT_TOAST_DURATION_MS}ms` }}
          aria-hidden
        />
      </article>
    </div>
  );
}

