"use client";

import { ChatListItem } from "@/components/chat/chat-list-item";
import { Inbox, Plus, RefreshCw, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { formatTimeAgo } from "../lib/format";
import { chatSocket } from "../services/socket-service";
import { useRoomStore } from "../stores/room-store";
import { useSocketStore } from "../stores/socket-store";

type ConversationListProps = {
  activeRoomId?: string;
  onSelect?: (roomId: string) => void;
};

export function ConversationList({
  activeRoomId,
  onSelect,
}: ConversationListProps) {
  const rooms = useRoomStore((s) => s.rooms);
  const loading = useRoomStore((s) => s.loading);
  const syncing = useSocketStore((s) => s.phase === "syncing");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter((r) =>
      r.otherUser.name.toLowerCase().includes(q),
    );
  }, [rooms, query]);

  const totalUnread = useMemo(
    () =>
      rooms.reduce((sum, r) => {
        if (activeRoomId && r.roomId === activeRoomId) return sum;
        return sum + (r.unread || 0);
      }, 0),
    [rooms, activeRoomId],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="chat-sidebar-head">
        <div className="chat-sidebar-head-top">
          <div className="chat-sidebar-head-copy">
            <span className="chat-sidebar-eyebrow">Inbox</span>
            <h2 className="chat-sidebar-title">Chats</h2>
            <p className="chat-sidebar-meta">
              {loading ? (
                "Loading conversations…"
              ) : (
                <>
                  <span className="chat-sidebar-meta-count">
                    {rooms.length}
                  </span>
                  {rooms.length === 1 ? " conversation" : " conversations"}
                  {totalUnread > 0 && (
                    <span className="chat-sidebar-meta-unread">
                      · {totalUnread} unread
                    </span>
                  )}
                </>
              )}
            </p>
          </div>

          <div className="chat-sidebar-toolbar" role="toolbar" aria-label="Chat actions">
            <button
              type="button"
              onClick={() => chatSocket.fetchConversations()}
              className="chat-sidebar-tool"
              aria-label="Refresh chats"
              title="Refresh"
            >
              <RefreshCw
                className={`h-[17px] w-[17px] ${syncing ? "animate-spin" : ""}`}
              />
            </button>
            <Link
              href="/"
              className="chat-sidebar-tool chat-sidebar-tool--primary"
              aria-label="Find new people"
              title="New chat"
            >
              <Plus className="h-[18px] w-[18px] stroke-[2.5]" />
            </Link>
          </div>
        </div>

        <label className="chat-sidebar-search">
          <span className="chat-sidebar-search-icon" aria-hidden="true">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="search"
            placeholder="Search chats…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search chats"
          />
          {query.length > 0 && (
            <button
              type="button"
              className="chat-sidebar-search-clear"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </label>
      </div>

      {loading ? (
        <div className="chat-sidebar-skeleton">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="chat-sidebar-skeleton-row">
              <div className="chat-sidebar-skeleton-avatar" />
              <div className="chat-sidebar-skeleton-lines">
                <div className="chat-sidebar-skeleton-line chat-sidebar-skeleton-line--wide" />
                <div className="chat-sidebar-skeleton-line" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="chat-sidebar-empty">
          <div className="chat-sidebar-empty-icon">
            <Inbox className="h-7 w-7" />
          </div>
          <p className="chat-sidebar-empty-title">
            {query ? "No matches" : "No chats yet"}
          </p>
          <p className="chat-sidebar-empty-desc">
            {query
              ? "Try a different name or clear your search."
              : "Start matching on Glice to open your first conversation."}
          </p>
          {!query && (
            <Link href="/" className="chat-sidebar-empty-cta">
              <Plus className="h-4 w-4" />
              Discover people
            </Link>
          )}
        </div>
      ) : (
        <div className="chat-sidebar-list min-h-0 flex-1 overflow-y-auto">
          {filtered.map((room) => {
            const { otherUser, recentMessage, typing, unread, timestamp } =
              room;
            const isYou = recentMessage.sender !== otherUser.uid;
            const msg = recentMessage.text.split("\n").join(" ").trim();
            const preview = recentMessage.unsend
              ? isYou
                ? "You deleted this message"
                : "Message deleted"
              : `${isYou ? "You: " : ""}${msg}`;

            return (
              <ChatListItem
                key={room.roomId}
                name={otherUser.name}
                avatarUrl={otherUser.profileUrl}
                preview={preview}
                time={formatTimeAgo(timestamp)}
                unread={activeRoomId === room.roomId ? 0 : unread}
                typing={typing}
                active={activeRoomId === room.roomId}
                isOnline={otherUser.isActive}
                isSentByMe={isYou}
                onClick={() => onSelect?.(room.roomId)}
                onDelete={() => chatSocket.deleteRoom(room.roomId)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
