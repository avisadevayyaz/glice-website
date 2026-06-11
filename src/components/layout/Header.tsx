"use client";

import { LogoutConfirmModal } from "@/components/auth/logout-confirm-modal";
import { useUiSession } from "@/components/site/ui-session-provider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function Header() {
  const pathname = usePathname();
  const { userName, userInitial, openAuth, logout } = useUiSession();
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const showAuthActions = pathname === "/";

  const handleLogoutConfirm = () => {
    setLogoutModalOpen(false);
    logout();
  };

  return (
    <>
      <header className="topbar" aria-label="Site">
        <Link href="/" className="nav-brand">
          <span className="nav-brand-mark" aria-hidden="true" />
          <span className="nav-name">
            <span className="nav-name-brand">Glice:</span> Live Video Chat Nearby
          </span>
        </Link>

        {showAuthActions && (
          <div className="topbar-actions topbar-guest">
            <button type="button" className="topbar-btn btn-messages">
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

        {showAuthActions && (
          <div className="topbar-actions topbar-user">
            <button type="button" className="topbar-btn btn-messages">
              <i className="ri-message-3-line" aria-hidden="true" />
              <span>Message</span>
            </button>
            <span className="topbar-avatar">{userInitial}</span>
            <span className="topbar-user-name">{userName}</span>
            <button
              type="button"
              className="topbar-btn"
              onClick={() => setLogoutModalOpen(true)}
            >
              Log out
            </button>
          </div>
        )}
      </header>

      <LogoutConfirmModal
        open={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={handleLogoutConfirm}
      />
    </>
  );
}
