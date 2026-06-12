"use client";

import { useUiSession } from "@/components/site/ui-session-provider";
import { History } from "lucide-react";
import Link from "next/link";

export function HistoryHeaderButton() {
  const { isLoggedIn, openAuth } = useUiSession();

  if (!isLoggedIn) {
    return (
      <button
        type="button"
        className="home-header-history-btn"
        onClick={() => openAuth("login")}
        aria-label="Random call history"
        title="History"
      >
        <History className="h-[18px] w-[18px]" aria-hidden="true" />
        <span>History</span>
      </button>
    );
  }

  return (
    <Link
      href="/history"
      className="home-header-history-btn"
      aria-label="Random call history"
      title="History"
    >
      <History className="h-[18px] w-[18px]" aria-hidden="true" />
      <span>History</span>
    </Link>
  );
}
