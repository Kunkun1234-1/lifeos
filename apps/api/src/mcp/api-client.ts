import { SignJWT } from "jose";

const encoder = new TextEncoder();

function apiSecret() {
  const value = process.env.API_JWT_SECRET || process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error("API_JWT_SECRET (or AUTH_SECRET) must be at least 32 characters");
  }
  return encoder.encode(value);
}

async function issueInternalApiToken(userId: string) {
  return new SignJWT({ type: "api_access", source: "lifeos-mcp" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuer("lifeos-web")
    .setAudience("lifeos-api")
    .setIssuedAt()
    .setExpirationTime("2m")
    .sign(apiSecret());
}

export class LifeOsApiError extends Error {
  constructor(
    readonly status: number,
    readonly payload: unknown,
  ) {
    super(apiErrorMessage(status, payload));
  }
}

function apiErrorMessage(status: number, payload: unknown) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const value = (payload as { error?: unknown }).error;
    if (typeof value === "string") return `LifeOS API ${status}: ${value}`;
  }
  if (typeof payload === "string" && payload.trim()) {
    return `LifeOS API ${status}: ${payload.slice(0, 500)}`;
  }
  return `LifeOS API request failed with status ${status}`;
}

export async function callLifeOsApi(input: {
  apiOrigin: string;
  userId: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  formData?: FormData;
  idempotencyKey?: string;
}) {
  if (!input.path.startsWith("/api/")) {
    throw new Error("MCP API bridge only permits registered /api routes");
  }

  const url = new URL(input.path, input.apiOrigin);
  for (const [key, value] of Object.entries(input.query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const headers = new Headers({
    Authorization: `Bearer ${await issueInternalApiToken(input.userId)}`,
    Accept: "application/json",
  });
  if (input.idempotencyKey) headers.set("Idempotency-Key", input.idempotencyKey);
  if (input.body !== undefined) headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(url, {
      method: input.method,
      headers,
      body:
        input.formData ??
        (input.body === undefined ? undefined : JSON.stringify(input.body)),
      cache: "no-store",
    });
  } catch (error) {
    const cause = error instanceof Error && error.cause instanceof Error
      ? `: ${error.cause.message}`
      : "";
    throw new Error(`LifeOS internal API request to ${url.origin} failed${cause}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text();
  if (!response.ok) throw new LifeOsApiError(response.status, payload);
  return payload;
}
