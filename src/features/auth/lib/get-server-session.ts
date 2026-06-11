import {
  parseSessionUserCookie,
  SESSION_COOKIE_NAME,
} from "@/features/auth/lib/session-cookie";
import type { GliceUser } from "@/features/auth/types";
import { cookies } from "next/headers";

export async function getServerSessionUser(): Promise<GliceUser | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return parseSessionUserCookie(value);
}
