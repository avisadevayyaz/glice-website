"use client";

import { useUiSession } from "@/components/site/ui-session-provider";
import { useEffect } from "react";
import { chatSocket } from "../services/socket-service";

export function ChatSocketInitializer(): null {
  const { isLoggedIn, isInitializing, user } = useUiSession();

  useEffect(() => {
    if (isInitializing) return;

    if (isLoggedIn && user) {
      chatSocket.connect({ user });
    } else {
      chatSocket.disconnect();
    }

    return () => {
      // Keep socket alive across route changes; disconnect only on logout above.
    };
  }, [isLoggedIn, isInitializing, user?._id, user?.email]);

  return null;
}
