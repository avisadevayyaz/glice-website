"use client";

import { LogoutConfirmModal } from "@/components/auth/logout-confirm-modal";
import { HomeHeaderActions } from "@/components/layout/home-header-actions";
import { MessagesBadgeButton } from "@/components/layout/messages-badge-button";
import { TopbarUserSection } from "@/components/layout/topbar-user-section";
import { useUiSession } from "@/components/site/ui-session-provider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function Header() {
  const pathname = usePathname();
  const { isLoggedIn, openAuth, logout } = useUiSession();
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const isHome = pathname === "/";
  const isHistory = pathname.startsWith("/history");
  const isMessages = pathname.startsWith("/messages");

  const handleLogoutConfirm = () => {
    setLogoutModalOpen(false);
    logout();
  };

  const loggedInActions = (messagesVariant: "topbar" | "icon") => (
    <>
      <MessagesBadgeButton
        variant={messagesVariant === "icon" ? "icon" : "topbar"}
      />
      <TopbarUserSection />
      <button
        type="button"
        className="topbar-btn"
        onClick={() => setLogoutModalOpen(true)}
      >
        Log out
      </button>
    </>
  );

  return (
    <>
      <header
        className={`topbar${isHome && isLoggedIn ? " topbar--home-premium" : ""}`}
        aria-label="Site"
      >
        <Link href="/" className="nav-brand">
          <span className="nav-brand-mark" aria-hidden="true" />
          <span className="nav-name">
            <span className="nav-name-brand">Glice:</span> Live Video Chat Nearby
          </span>
        </Link>

        {isHome && !isLoggedIn && (
          <div className="topbar-actions">
            <MessagesBadgeButton />
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

        {isHome && isLoggedIn && <HomeHeaderActions />}

        {!isHome && isLoggedIn && !isMessages && (
          <div className="topbar-actions topbar-user--always">
            {isHistory && (
              <Link href="/" className="topbar-btn">
                Live video
              </Link>
            )}
            {loggedInActions("icon")}
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
