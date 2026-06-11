"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function ChatRouteEffect() {
  const pathname = usePathname();

  useEffect(() => {
    const isChat = pathname.startsWith("/messages");
    document.body.classList.toggle("chat-route", isChat);
  }, [pathname]);

  return null;
}
