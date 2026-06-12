"use client";

import { hydrateSessionUser } from "@/features/auth/lib/hydrate-session-user";
import { useUiSession } from "@/components/site/ui-session-provider";
import { resolveSocketUserLocation } from "@/features/video/lib/discover-location";
import { useEffect, useRef } from "react";
import { chatSocket } from "../services/socket-service";

export function ChatSocketInitializer(): null {
  const { isLoggedIn, isInitializing, user, applySessionUser } = useUiSession();
  const connectGen = useRef(0);

  useEffect(() => {
    if (isInitializing) return;

    if (!isLoggedIn || !user) {
      chatSocket.disconnect();
      return;
    }

    const generation = ++connectGen.current;
    let cancelled = false;

    void (async () => {
      const hydrated = await hydrateSessionUser(user);
      if (cancelled || generation !== connectGen.current) return;

      if (hydrated._id && hydrated._id !== user._id) {
        applySessionUser(hydrated);
      }

      const location = await resolveSocketUserLocation(hydrated);
      chatSocket.connect({ user: hydrated, location });
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, isInitializing, user?._id, user?.email, applySessionUser]);

  return null;
}
