"use client";

import { UserAvatar } from "@/components/chat/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Ban, MoreHorizontal, UserMinus } from "lucide-react";
import { chatSocket } from "../services/socket-service";
import type { ChatRoom } from "../types";

type ConversationHeaderProps = {
  room: ChatRoom;
  onBack?: () => void;
};

export function ConversationHeader({ room, onBack }: ConversationHeaderProps) {
  const { otherUser } = room;

  return (
    <header className="chat-conversation-header">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text)] hover:bg-[var(--surface-2)] md:hidden"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}

      <UserAvatar
        name={otherUser.name}
        url={otherUser.profileUrl}
        size="lg"
        isOnline={otherUser.isActive}
      />

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold">{otherUser.name}</h1>
        <p className="truncate text-xs text-[var(--primary)]">
          {otherUser.isActive ? "Online" : otherUser.location?.text || "Offline"}
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="chat-header-menu-btn"
            aria-label="Conversation options"
          >
            <MoreHorizontal className="h-[18px] w-[18px]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="chat-menu-panel">
          <DropdownMenuItem
            className="chat-menu-item"
            onClick={() => {
              const matchId = String(
                (room.users as { _id?: string })._id ?? room.roomId,
              );
              chatSocket.unmatch(room.roomId, matchId, otherUser.email);
            }}
          >
            <UserMinus className="h-4 w-4" />
            Unpair
          </DropdownMenuItem>
          <DropdownMenuItem
            className="chat-menu-item chat-menu-item--danger"
            onClick={() => chatSocket.blockUser(room.roomId, otherUser.email)}
          >
            <Ban className="h-4 w-4" />
            Block user
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
