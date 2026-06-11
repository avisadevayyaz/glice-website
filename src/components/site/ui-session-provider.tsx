"use client";

import { getUser } from "@/features/auth/api/auth-api";
import { refreshAccessToken } from "@/features/auth/lib/refresh-auth";
import { tokenStorage } from "@/features/auth/lib/token-storage";
import { chatSocket } from "@/features/chat/services/socket-service";
import type { GliceUser } from "@/features/auth/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";

type AuthModalMode = "login" | "signup" | null;

type UiSessionContextValue = {
  isLoggedIn: boolean;
  isInitializing: boolean;
  user: GliceUser | null;
  userName: string;
  userInitial: string;
  authModalOpen: boolean;
  authModalMode: AuthModalMode;
  openAuth: (mode?: "login" | "signup") => void;
  closeAuth: () => void;
  setUserFromAuth: (user: GliceUser) => void;
  logout: () => void;
};

const UiSessionContext = createContext<UiSessionContextValue | null>(null);

function displayName(user: GliceUser | null): string {
  if (!user) return "User";
  if (user.name?.trim()) return user.name.trim();
  if (user.username?.trim()) return user.username.trim();
  return user.email.split("@")[0] || "User";
}

export function UiSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(() =>
    tokenStorage.hasPersistedSession(),
  );
  const [user, setUser] = useState<GliceUser | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>(null);

  const userName = displayName(user);
  const userInitial = userName.charAt(0).toUpperCase() || "G";

  useLayoutEffect(() => {
    const body = document.body;
    body.classList.toggle("is-logged-in", isLoggedIn);
    body.classList.toggle("video-hero-active", pathname === "/");
  }, [isLoggedIn, pathname]);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      if (!tokenStorage.hasPersistedSession()) {
        if (!cancelled) setIsInitializing(false);
        return;
      }

      try {
        const email = tokenStorage.getUserEmail();
        if (!email) return;

        const accessToken = await refreshAccessToken();
        if (!accessToken) return;

        const restoredUser = await getUser(email);
        if (cancelled) return;

        setUser(restoredUser);
        setIsLoggedIn(true);
      } catch {
        tokenStorage.clear();
        if (!cancelled) {
          setUser(null);
          setIsLoggedIn(false);
        }
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const openAuth = useCallback((mode: "login" | "signup" = "login") => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  }, []);

  const closeAuth = useCallback(() => {
    setAuthModalOpen(false);
    setAuthModalMode(null);
  }, []);

  const setUserFromAuth = useCallback((nextUser: GliceUser) => {
    setUser(nextUser);
    setIsLoggedIn(true);
    closeAuth();
  }, [closeAuth]);

  const logout = useCallback(() => {
    chatSocket.logout();
    tokenStorage.clear();
    setUser(null);
    setIsLoggedIn(false);
    document.body.classList.remove("is-logged-in");
  }, []);

  const value = useMemo(
    () => ({
      isLoggedIn,
      isInitializing,
      user,
      userName,
      userInitial,
      authModalOpen,
      authModalMode,
      openAuth,
      closeAuth,
      setUserFromAuth,
      logout,
    }),
    [
      isLoggedIn,
      isInitializing,
      user,
      userName,
      userInitial,
      authModalOpen,
      authModalMode,
      openAuth,
      closeAuth,
      setUserFromAuth,
      logout,
    ],
  );

  return (
    <UiSessionContext.Provider value={value}>{children}</UiSessionContext.Provider>
  );
}

export function useUiSession() {
  const context = useContext(UiSessionContext);
  if (!context) {
    throw new Error("useUiSession must be used within UiSessionProvider");
  }
  return context;
}
