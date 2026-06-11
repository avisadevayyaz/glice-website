"use client";

import { useUiSession } from "@/components/site/ui-session-provider";
import { MessageSquare } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { ChatThreadLayoutEffect } from "./chat-thread-layout-effect";
import { ConversationList } from "./conversation-list";
import { ConversationView } from "./conversation-view";

export function ChatShell() {
  const { isLoggedIn, isInitializing, openAuth } = useUiSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeRoomId = searchParams.get("room") ?? "";

  const selectRoom = useCallback(
    (roomId: string) => {
      router.push(`/messages?room=${encodeURIComponent(roomId)}`, {
        scroll: false,
      });
    },
    [router],
  );

  const clearRoom = useCallback(() => {
    router.push("/messages", { scroll: false });
  }, [router]);

  if (isInitializing) {
    return (
      <div className="chat-layout">
        <aside className="chat-sidebar">
          <div className="animate-pulse space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="h-11 w-11 rounded-full bg-[var(--surface-2)]" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 w-2/3 rounded bg-[var(--surface-2)]" />
                  <div className="h-3 w-1/2 rounded bg-[var(--surface-2)]" />
                </div>
              </div>
            ))}
          </div>
        </aside>
        <main className="chat-main hidden md:flex" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: "var(--surface-2)" }}
        >
          <MessageSquare className="h-8 w-8 text-[var(--primary)]" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Messages</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Sign in to view your conversations.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openAuth("login")}
          className="rounded-full px-5 py-2.5 text-sm font-semibold"
          style={{ background: "var(--primary)", color: "#0a0f0d" }}
        >
          Sign in
        </button>
      </div>
    );
  }

  const showThread = Boolean(activeRoomId);

  return (
    <>
      <ChatThreadLayoutEffect />
      <div className="chat-layout">
      <aside
        className={`chat-sidebar ${showThread ? "chat-sidebar-hidden md:flex" : ""}`}
      >
        <ConversationList
          activeRoomId={activeRoomId}
          onSelect={selectRoom}
        />
      </aside>

      <main
        className={`chat-main ${!showThread ? "chat-main-hidden md:flex" : ""}`}
      >
        {showThread ? (
          <ConversationView roomId={activeRoomId} onBack={clearRoom} />
        ) : (
          <div className="hidden flex-1 flex-col items-center justify-center gap-3 p-8 text-center md:flex">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl border"
              style={{
                borderColor: "var(--hair)",
                background: "var(--surface-2)",
              }}
            >
              <MessageSquare className="h-8 w-8 text-[var(--muted)]" />
            </div>
            <p className="font-medium">Your messages</p>
            <p className="text-sm text-[var(--muted)]">
              Pick a chat from the sidebar to start messaging
            </p>
          </div>
        )}
      </main>
    </div>
    </>
  );
}
