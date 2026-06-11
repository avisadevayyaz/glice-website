"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUiSession } from "@/components/site/ui-session-provider";
export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, userName, userInitial, openAuth, logout } = useUiSession();
  const showAuthActions = pathname === "/";
  const isMessagesRoute = pathname.startsWith("/messages");

  const openMessages = () => {
    if (isLoggedIn) {
      router.push("/messages");
      return;
    }
    openAuth("login");
  };

  return (
    <header className="topbar" aria-label="Site">
      <Link href="/" className="nav-brand">
        <span className="nav-brand-mark" aria-hidden="true" />
        <span className="nav-name">
          <span className="nav-name-brand">Glice:</span> Live Video Chat Nearby
        </span>
      </Link>

      {(showAuthActions || isMessagesRoute) && (
      <div className="topbar-actions topbar-guest">
        <button
          type="button"
          className="topbar-btn btn-messages"
          onClick={openMessages}
        >
          <i className="ri-message-3-line" aria-hidden="true" />
          <span>Message</span>
        </button>
        <button
          type="button"
          className="topbar-btn"
          onClick={() => openAuth("login")}
        >
          Login
        </button>
        <button
          type="button"
          className="topbar-btn topbar-btn--signup"
          onClick={() => openAuth("signup")}
        >
          Sign up
        </button>
      </div>
      )}

      {(showAuthActions || isMessagesRoute) && (
      <div className="topbar-actions topbar-user">
        <button
          type="button"
          className="topbar-btn btn-messages"
          onClick={openMessages}
        >
          <i className="ri-message-3-line" aria-hidden="true" />
          <span>Message</span>
        </button>
        <span className="topbar-avatar">{userInitial}</span>
        <span className="topbar-user-name">{userName}</span>
        <button
          type="button"
          className="topbar-btn"
          onClick={logout}
        >
          Log out
        </button>
      </div>
      )}
    </header>
  );
}
