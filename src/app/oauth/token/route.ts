import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getMcpResourceUrl,
  hashOpaqueToken,
  issueMcpAccessToken,
  pkceChallenge,
  randomOpaqueToken,
  REFRESH_TOKEN_TTL_SECONDS,
} from "@/lib/mcp-auth";

export const dynamic = "force-dynamic";

function oauthError(error: string, description: string, status = 400) {
  return NextResponse.json(
    { error, error_description: description },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

async function issueTokenPair(tx: Prisma.TransactionClient, input: {
  userId: string;
  clientId: string;
  scope: string;
  resource: string;
}) {
  const refreshToken = randomOpaqueToken(48);
  await tx.oAuthRefreshToken.create({
    data: {
      id: hashOpaqueToken(refreshToken),
      userId: input.userId,
      clientId: input.clientId,
      scope: input.scope,
      resource: input.resource,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
    },
  });
  const access = await issueMcpAccessToken({
    userId: input.userId,
    clientId: input.clientId,
    scopes: input.scope.split(/\s+/).filter(Boolean),
    resource: input.resource,
  });
  return { access, refreshToken };
}

export async function POST(req: Request) {
  const form = await req.formData();
  const grantType = String(form.get("grant_type") ?? "");
  const clientId = String(form.get("client_id") ?? "");
  // Older OAuth clients may omit resource on refresh. In that case use the
  // resource already bound to the grant, never a new client-selected audience.
  const resource = form.has("resource") ? String(form.get("resource")) : null;
  if (!clientId || (resource !== null && resource !== getMcpResourceUrl())) {
    return oauthError("invalid_request", "Invalid client_id or resource");
  }

  const client = await prisma.oAuthClient.findUnique({ where: { id: clientId } });
  if (!client || client.tokenEndpointAuthMethod !== "none") {
    return oauthError("invalid_client", "Unknown OAuth client", 401);
  }

  if (grantType === "authorization_code") {
    const code = String(form.get("code") ?? "");
    const redirectUri = String(form.get("redirect_uri") ?? "");
    const verifier = String(form.get("code_verifier") ?? "");
    if (!code || !redirectUri || !verifier) {
      return oauthError("invalid_request", "Missing authorization code parameters");
    }

    const stored = await prisma.oAuthAuthorizationCode.findUnique({
      where: { id: hashOpaqueToken(code) },
    });
    if (
      !stored ||
      stored.clientId !== clientId ||
      stored.redirectUri !== redirectUri ||
      stored.resource !== getMcpResourceUrl() ||
      (resource !== null && stored.resource !== resource) ||
      stored.expiresAt <= new Date() ||
      pkceChallenge(verifier) !== stored.codeChallenge
    ) {
      return oauthError("invalid_grant", "Invalid or expired authorization code");
    }

    const pair = await prisma.$transaction(async (tx) => {
      const consumed = await tx.oAuthAuthorizationCode.deleteMany({
        where: { id: stored.id, expiresAt: { gt: new Date() } },
      });
      if (consumed.count !== 1) return null;
      return issueTokenPair(tx, stored);
    });
    if (!pair) {
      return oauthError("invalid_grant", "Authorization code was already used");
    }
    return NextResponse.json(
      {
        access_token: pair.access.token,
        token_type: "Bearer",
        expires_in: pair.access.expiresIn,
        refresh_token: pair.refreshToken,
        scope: stored.scope,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  if (grantType === "refresh_token") {
    const refreshToken = String(form.get("refresh_token") ?? "");
    const stored = await prisma.oAuthRefreshToken.findUnique({
      where: { id: hashOpaqueToken(refreshToken) },
    });
    if (
      !stored ||
      stored.clientId !== clientId ||
      stored.resource !== getMcpResourceUrl() ||
      (resource !== null && stored.resource !== resource) ||
      stored.revokedAt ||
      stored.expiresAt <= new Date()
    ) {
      return oauthError("invalid_grant", "Invalid or expired refresh token");
    }

    // Rotate atomically: a failed insert/signing operation must leave the old
    // refresh token usable, so a transient server error doesn't force login.
    const pair = await prisma.$transaction(async (tx) => {
      const rotated = await tx.oAuthRefreshToken.updateMany({
        where: { id: stored.id, revokedAt: null, expiresAt: { gt: new Date() } },
        data: { revokedAt: new Date() },
      });
      if (rotated.count !== 1) return null;
      return issueTokenPair(tx, stored);
    });
    if (!pair) {
      return oauthError("invalid_grant", "Refresh token was already used");
    }
    return NextResponse.json(
      {
        access_token: pair.access.token,
        token_type: "Bearer",
        expires_in: pair.access.expiresIn,
        refresh_token: pair.refreshToken,
        scope: stored.scope,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return oauthError("unsupported_grant_type", "Unsupported grant_type");
}
