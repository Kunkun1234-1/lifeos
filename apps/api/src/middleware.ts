import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (request.method === "OPTIONS") {
    return withCors(new NextResponse(null, { status: 204 }), origin);
  }

  const authorization = request.headers.get("authorization");
  const secretValue = process.env.API_JWT_SECRET || process.env.AUTH_SECRET;
  if (!authorization?.startsWith("Bearer ")) {
    return withCors(
      NextResponse.json({ error: "Unauthenticated" }, { status: 401 }),
      origin,
    );
  }
  if (!secretValue || secretValue.length < 32) {
    return withCors(
      NextResponse.json({ error: "API authentication is not configured" }, { status: 503 }),
      origin,
    );
  }

  try {
    await jwtVerify(authorization.slice(7), new TextEncoder().encode(secretValue), {
      issuer: "lifeos-web",
      audience: "lifeos-api",
    });
  } catch {
    return withCors(
      NextResponse.json({ error: "Invalid or expired access token" }, { status: 401 }),
      origin,
    );
  }

  return withCors(NextResponse.next(), origin);
}

function withCors(response: NextResponse, origin: string | null) {
  const allowed = new Set(
    (process.env.WEB_ORIGIN ?? "http://localhost:3000")
      .split(",")
      .map((value) => value.trim()),
  );
  if (process.env.NODE_ENV !== "production") {
    allowed.add("http://localhost:3000");
    allowed.add("http://127.0.0.1:3000");
  }
  if (origin && allowed.has(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  }
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, Idempotency-Key",
  );
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
