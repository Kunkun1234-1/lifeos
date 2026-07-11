import { SignJWT } from "jose";
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/user";

const TOKEN_TTL_SECONDS = 5 * 60;

export async function POST() {
  const userId = await getCurrentUserId();
  const jwtSecret = process.env.API_JWT_SECRET || process.env.AUTH_SECRET;

  if (!jwtSecret || jwtSecret.length < 32) {
    return NextResponse.json(
      { error: "Independent API authentication is not configured" },
      { status: 503 },
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + TOKEN_TTL_SECONDS;
  const token = await new SignJWT({ type: "api_access" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer("lifeos-web")
    .setAudience("lifeos-api")
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .sign(new TextEncoder().encode(jwtSecret));

  return NextResponse.json({ token, expiresAt });
}
