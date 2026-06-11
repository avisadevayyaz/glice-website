import {
  buildClearSessionCookieValue,
  buildSessionCookieValue,
} from "@/features/auth/lib/session-cookie";
import { tokenStorage } from "@/features/auth/lib/token-storage";
import type { GliceUser } from "@/features/auth/types";

export const SESSION_EXPIRED_EVENT = "glice:session-expired";

export function persistAuthSession(
  accessToken: string,
  refreshToken: string,
  user: GliceUser,
): void {
  tokenStorage.setSession(accessToken, refreshToken, user.email);
  tokenStorage.setUser(user);

  if (typeof document !== "undefined") {
    document.cookie = buildSessionCookieValue(user);
  }
}

export function clearAuthSession(): void {
  tokenStorage.clear();

  if (typeof document !== "undefined") {
    document.cookie = buildClearSessionCookieValue();
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  }
}
