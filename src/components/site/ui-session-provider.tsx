"use client";

import {
  clearAuthSession,
  SESSION_EXPIRED_EVENT,
} from "@/features/auth/lib/persist-session";
import { buildSessionCookieValue } from "@/features/auth/lib/session-cookie";
import { tokenStorage } from "@/features/auth/lib/token-storage";
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

function readClientStoredUser(): GliceUser | null {
  return tokenStorage.getUser();
}

export function UiSessionProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: GliceUser | null;
}) {
  const pathname = usePathname();
  const [user, setUser] = useState<GliceUser | null>(initialUser);
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(initialUser));
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>(null);

  const userName = displayName(user);
  const userInitial = userName.charAt(0).toUpperCase() || "G";

  useLayoutEffect(() => {
    const body = document.body;
    body.classList.toggle("is-logged-in", isLoggedIn);
    body.classList.toggle("video-hero-active", pathname === "/");
  }, [isLoggedIn, pathname]);

  useLayoutEffect(() => {
    if (initialUser) return;

    let storedUser = readClientStoredUser();

    if (!storedUser) {
      const email = tokenStorage.getUserEmail();
      if (email && tokenStorage.hasAccessToken()) {
        storedUser = {
          _id: "",
          email,
          name: email.split("@")[0] || "User",
        };
        tokenStorage.setUser(storedUser);
        document.cookie = buildSessionCookieValue(storedUser);
      }
    }

    if (!storedUser) return;

    setUser(storedUser);
    setIsLoggedIn(true);
    document.body.classList.add("is-logged-in");
  }, [initialUser]);

  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      setIsLoggedIn(false);
      document.body.classList.remove("is-logged-in");
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
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

  const setUserFromAuth = useCallback(
    (nextUser: GliceUser) => {
      setUser(nextUser);
      setIsLoggedIn(true);
      document.body.classList.add("is-logged-in");
      closeAuth();
    },
    [closeAuth],
  );

  const logout = useCallback(() => {
    clearAuthSession();
    setUser(null);
    setIsLoggedIn(false);
    document.body.classList.remove("is-logged-in");
  }, []);

  const value = useMemo(
    () => ({
      isLoggedIn,
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
