"use client";

import { UserAvatar } from "@/components/chat/user-avatar";
import { useUiSession } from "@/components/site/ui-session-provider";
import { ArrowLeft, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function ChatTopbar() {
  const router = useRouter();
  const { userName, logout } = useUiSession();

  return (
    <header className="chat-topbar">
      <Link href="/" className="chat-topbar-btn" aria-label="Back">
        <ArrowLeft className="h-5 w-5" />
      </Link>

      <div className="chat-topbar-title">
        <span className="chat-topbar-mark" aria-hidden="true" />
        <h1>Messages</h1>
      </div>

      <div className="flex items-center gap-2">
        <UserAvatar name={userName} size="sm" />
        <button
          type="button"
          onClick={() => {
            logout();
            router.push("/");
          }}
          className="chat-topbar-btn chat-topbar-btn--text"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </div>
    </header>
  );
}
