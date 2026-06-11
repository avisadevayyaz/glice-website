import type { GliceUser } from "@/features/auth/types";

export const SESSION_COOKIE_NAME = "glice_user";
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function parseSessionUserCookie(
  value: string | undefined,
): GliceUser | null {
  if (!value) return null;

  try {
    return JSON.parse(decodeURIComponent(value)) as GliceUser;
  } catch {
    return null;
  }
}

export function serializeSessionUser(user: GliceUser): string {
  return encodeURIComponent(JSON.stringify(user));
}

export function buildSessionCookieValue(user: GliceUser): string {
  return `${SESSION_COOKIE_NAME}=${serializeSessionUser(user)}; path=/; max-age=${SESSION_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function buildClearSessionCookieValue(): string {
  return `${SESSION_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}
