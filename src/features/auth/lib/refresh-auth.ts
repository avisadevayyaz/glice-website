import { refreshTokenRoute } from "@/features/auth/api/routes";
import { clearAuthSession } from "@/features/auth/lib/persist-session";
import { tokenStorage } from "@/features/auth/lib/token-storage";
import type { RefreshTokenResponse } from "@/features/auth/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

let refreshPromise: Promise<string | null> | null = null;

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    const email = tokenStorage.getUserEmail();

    if (!BASE_URL || !refreshToken || !email) {
      return null;
    }

    try {
      const response = await fetch(`${BASE_URL}${refreshTokenRoute}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: refreshToken, email }),
      });

      const data = (await parseBody(response)) as
        | RefreshTokenResponse
        | { message?: string; success?: boolean };

      if (
        !response.ok ||
        !data ||
        typeof data !== "object" ||
        !("accessToken" in data)
      ) {
        clearAuthSession();
        return null;
      }

      const { accessToken, refreshToken: newRefreshToken } = data;
      tokenStorage.setAccessToken(accessToken);
      tokenStorage.setRefreshToken(newRefreshToken);
      return accessToken;
    } catch {
      clearAuthSession();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
