"use client";



import {

  clearAuthSession,

  SESSION_EXPIRED_EVENT,

} from "@/features/auth/lib/persist-session";

import { buildSessionCookieValue } from "@/features/auth/lib/session-cookie";

import { tokenStorage } from "@/features/auth/lib/token-storage";

import { chatSocket } from "@/features/chat/services/socket-service";
import { useCallHistoryStore } from "@/features/video/stores/call-history-store";

import type { GliceUser } from "@/features/auth/types";

import {

  createContext,

  useCallback,

  useContext,

  useEffect,

  useMemo,

  useState,

} from "react";

import { usePathname } from "next/navigation";



type AuthModalMode = "login" | "signup" | null;



type SessionState = {

  user: GliceUser | null;

  isLoggedIn: boolean;

  isInitializing: boolean;

};



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

  applySessionUser: (user: GliceUser) => void;

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



function createInitialSession(initialUser: GliceUser | null): SessionState {

  return {

    user: initialUser,

    isLoggedIn: Boolean(initialUser),

    isInitializing: !initialUser,

  };

}



function restoreClientSession(): SessionState {

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



  if (storedUser) {

    return {

      user: storedUser,

      isLoggedIn: true,

      isInitializing: false,

    };

  }



  return {

    user: null,

    isLoggedIn: false,

    isInitializing: false,

  };

}



export function UiSessionProvider({

  children,

  initialUser,

}: {

  children: React.ReactNode;

  initialUser: GliceUser | null;

}) {

  const pathname = usePathname();

  const [session, setSession] = useState<SessionState>(() =>

    createInitialSession(initialUser),

  );

  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>(null);



  const { user, isLoggedIn, isInitializing } = session;

  const userName = displayName(user);

  const userInitial = userName.charAt(0).toUpperCase() || "G";



  useEffect(() => {
    const body = document.body;
    body.classList.toggle("is-logged-in", isLoggedIn);
    body.classList.toggle("video-hero-active", pathname === "/");
  }, [isLoggedIn, pathname]);



  useEffect(() => {

    if (initialUser) return;



    let cancelled = false;



    queueMicrotask(() => {

      if (cancelled) return;



      const restored = restoreClientSession();

      if (restored.isLoggedIn) {

        document.body.classList.add("is-logged-in");

      }

      setSession(restored);

    });



    return () => {

      cancelled = true;

    };

  }, [initialUser]);



  useEffect(() => {

    const handleSessionExpired = () => {

      chatSocket.disconnect();

      setSession({

        user: null,

        isLoggedIn: false,

        isInitializing: false,

      });

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

      setSession({

        user: nextUser,

        isLoggedIn: true,

        isInitializing: false,

      });

      document.body.classList.add("is-logged-in");

      closeAuth();

    },

    [closeAuth],

  );



  const applySessionUser = useCallback((nextUser: GliceUser) => {

    setSession({

      user: nextUser,

      isLoggedIn: true,

      isInitializing: false,

    });

    tokenStorage.setUser(nextUser);

    document.body.classList.add("is-logged-in");

  }, []);



  const logout = useCallback(() => {

    chatSocket.disconnect();
    useCallHistoryStore.getState().reset();

    clearAuthSession();

    setSession({

      user: null,

      isLoggedIn: false,

      isInitializing: false,

    });

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

      applySessionUser,

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

      applySessionUser,

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


