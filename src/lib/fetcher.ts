export async function api<T = unknown>(
  path: string,
  init?: RequestInit & { json?: unknown; backend?: boolean }
): Promise<T> {
  const { backend = false, json, ...requestInit } = init ?? {};
  const configuredBackendUrl =
    process.env.NEXT_PUBLIC_API_URL ??
    (process.env.NODE_ENV === "development" ? "http://127.0.0.1:4000" : undefined);
  const backendUrl = configuredBackendUrl?.replace(/\/$/, "");
  const isBusinessApi = path.startsWith("/api/") && !path.startsWith("/api/auth/");
  if (isBusinessApi && !backendUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is required for business API requests");
  }
  const useBackend = !!backendUrl && (backend || isBusinessApi);
  const headers = new Headers(requestInit.headers);
  let body = requestInit.body;
  if (json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(json);
  }

  const requestPath = useBackend
    ? `${backendUrl}${path}`
    : path;

  if (useBackend) {
    headers.set("Authorization", `Bearer ${await getBackendToken()}`);
  }

  let res = await fetch(requestPath, { ...requestInit, headers, body });
  if (useBackend && res.status === 401) {
    clearBackendToken();
    headers.set("Authorization", `Bearer ${await getBackendToken()}`);
    res = await fetch(requestPath, { ...requestInit, headers, body });
  }
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    const msg = (data as { error?: string } | null)?.error ?? `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return data as T;
}

type BackendToken = { token: string; expiresAt: number };

let backendToken: BackendToken | null = null;
let backendTokenRequest: Promise<BackendToken> | null = null;

async function getBackendToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (backendToken && backendToken.expiresAt - 30 > now) {
    return backendToken.token;
  }

  if (!backendTokenRequest) {
    backendTokenRequest = fetch("/api/auth/backend-token", { method: "POST" })
      .then(async (response) => {
        const data = (await response.json().catch(() => null)) as
          | (BackendToken & { error?: string })
          | null;
        if (!response.ok || !data?.token) {
          throw new Error(data?.error ?? "Unable to authenticate with backend API");
        }
        backendToken = data;
        return data;
      })
      .finally(() => {
        backendTokenRequest = null;
      });
  }

  return (await backendTokenRequest).token;
}

function clearBackendToken() {
  backendToken = null;
}

function safeJson(t: string): unknown {
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}
