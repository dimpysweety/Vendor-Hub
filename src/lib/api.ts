/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Simple typed API helper for REST endpoints with automated token headers
export interface ApiErrorResponse {
  error: string;
  message: string;
  postgresError?: {
    code: string;
    detail: string;
    table?: string;
    constraint?: string;
    query?: string;
    severity?: string;
  };
}

export function getToken(): string | null {
  return localStorage.getItem("platform_session_jwt");
}

export function setToken(token: string) {
  localStorage.setItem("platform_session_jwt", token);
}

export function removeToken() {
  localStorage.removeItem("platform_session_jwt");
}

export async function requestApi<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  } as Record<string, string>;

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorBody: ApiErrorResponse;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = {
        error: "HTTP_ERROR",
        message: `HTTP endpoint returned statusCode ${response.status}`,
      };
    }

    // Handle session expired or unauthorized access gracefully
    if (response.status === 401 || response.status === 403) {
      removeToken();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("unauthorized-session"));
      }
    }

    throw errorBody;
  }

  return response.json() as Promise<T>;
}
