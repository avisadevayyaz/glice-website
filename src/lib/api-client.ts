import { clearAuthSession } from "@/features/auth/lib/persist-session";
import { refreshAccessToken } from "@/features/auth/lib/refresh-auth";
import { tokenStorage } from "@/features/auth/lib/token-storage";
import { handleError, type ApiError } from "./error-handler";

type RequestConfig = {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  requireAuth?: boolean;
  body?: unknown;
  _retried?: boolean;
};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const DEFAULT_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
};

function buildURL(
  endpoint: string,
  params?: Record<string, string | number | boolean>,
): string {
  const base = BASE_URL.replace(/\/$/, "");
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = new URL(`${base}${path}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }

  return url.toString();
}

function prepareBody(body: unknown): BodyInit | undefined {
  if (body instanceof FormData) return body;
  if (body === null || body === undefined) return undefined;
  if (typeof body === "string") return body;
  return JSON.stringify(body);
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function authHeaders(requireAuth: boolean): Record<string, string> {
  if (!requireAuth) return {};
  const token = tokenStorage.getAccessToken();
  if (!token) return {};
  return { authorization: token };
}

async function request<T>(
  endpoint: string,
  config: RequestConfig = {},
): Promise<T> {
  const {
    method = "GET",
    headers = {},
    params,
    body,
    requireAuth = true,
    _retried = false,
  } = config;

  if (!BASE_URL) {
    throw {
      status: 0,
      message: "NEXT_PUBLIC_API_URL is not configured",
    } as ApiError;
  }

  const url = buildURL(endpoint, params);
  const isFormData = body instanceof FormData;

  const requestHeaders: HeadersInit = {
    ...(isFormData ? {} : DEFAULT_HEADERS),
    ...authHeaders(requireAuth),
    ...headers,
  };

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: prepareBody(body),
    });

    const data = await parseBody(response);

    if (response.status === 401 && requireAuth && !_retried) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return request<T>(endpoint, { ...config, _retried: true });
      }
      clearAuthSession();
    }

    if (!response.ok) {
      throw handleError(response.status, data);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return data as T;
  } catch (error) {
    if (error && typeof error === "object" && "status" in error) {
      throw error;
    }

    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw {
        status: 0,
        message: "Network error - please check your connection",
      } as ApiError;
    }

    throw {
      status: 500,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    } as ApiError;
  }
}

export const apiClient = {
  get: <T>(
    endpoint: string,
    params?: Record<string, string | number | boolean>,
    requireAuth = true,
  ) => request<T>(endpoint, { method: "GET", params, requireAuth }),

  post: <T>(endpoint: string, body?: unknown, requireAuth = true) =>
    request<T>(endpoint, { method: "POST", body, requireAuth }),

  put: <T>(endpoint: string, body?: unknown, requireAuth = true) =>
    request<T>(endpoint, { method: "PUT", body, requireAuth }),

  patch: <T>(endpoint: string, body?: unknown, requireAuth = true) =>
    request<T>(endpoint, { method: "PATCH", body, requireAuth }),

  delete: <T>(endpoint: string, requireAuth = true) =>
    request<T>(endpoint, { method: "DELETE", requireAuth }),

  request,
};

export type { ApiError };
