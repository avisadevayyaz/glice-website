"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

/** Toggles layout mode on `.chat-app` for mobile thread vs inbox list. */
export function ChatThreadLayoutEffect(): null {
  const searchParams = useSearchParams();
  const roomId = searchParams.get("room") ?? "";

  useEffect(() => {
    const app = document.querySelector(".chat-app");
    if (!app) return;

    if (roomId) {
      app.setAttribute("data-thread-open", "true");
    } else {
      app.removeAttribute("data-thread-open");
    }

    return () => {
      app.removeAttribute("data-thread-open");
    };
  }, [roomId]);

  return null;
}
