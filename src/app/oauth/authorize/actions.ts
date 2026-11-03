"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  AUTHORIZATION_CODE_TTL_SECONDS,
  getMcpResourceUrl,
  hashOpaqueToken,
  parseRequestedScopes,
  randomOpaqueToken,
} from "@/lib/mcp-auth";

type AuthorizationRequest = {
  clientId: string;
  redirectUri: string;
  responseType: string;
  scope: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  resource: string;
};

function field(form: FormData, name: string) {
  return String(form.get(name) ?? "");
}

function readRequest(form: FormData): AuthorizationRequest {
  return {
    clientId: field(form, "client_id"),
    redirectUri: field(form, "redirect_uri"),
    responseType: field(form, "response_type"),
    scope: field(form, "scope"),
    state: field(form, "state"),
    codeChallenge: field(form, "code_challenge"),
    codeChallengeMethod: field(form, "code_challenge_method"),
    resource: field(form, "resource"),
  };
}

async function validateRequest(input: AuthorizationRequest) {
  const client = await prisma.oAuthClient.findUnique({
    where: { id: input.clientId },
  });
  const redirectUris = Array.isArray(client?.redirectUris)
    ? client.redirectUris.filter((value): value is string => typeof value === "string")
    : [];
  if (!client || !redirectUris.includes(input.redirectUri)) {
    throw new Error("Unknown OAuth client or redirect URI");
  }
  if (
    input.responseType !== "code" ||
    input.codeChallengeMethod !== "S256" ||
    input.codeChallenge.length < 43 ||
    input.resource !== getMcpResourceUrl()
  ) {
    throw new Error("Invalid OAuth authorization request");
  }
  return { client, scopes: parseRequestedScopes(input.scope) };
}

function redirectWith(input: AuthorizationRequest, values: Record<string, string>) {
  const url = new URL(input.redirectUri);
  for (const [key, value] of Object.entries(values)) url.searchParams.set(key, value);
  if (input.state) url.searchParams.set("state", input.state);
  redirect(url.toString());
}

async function completeAuthorization(
  input: AuthorizationRequest,
  userId: string,
  scopes: string[],
) {
  const code = randomOpaqueToken(48);
  await prisma.oAuthAuthorizationCode.create({
    data: {
      id: hashOpaqueToken(code),
      clientId: input.clientId,
      userId,
      redirectUri: input.redirectUri,
      scope: scopes.join(" "),
      resource: input.resource,
      codeChallenge: input.codeChallenge,
      expiresAt: new Date(Date.now() + AUTHORIZATION_CODE_TTL_SECONDS * 1000),
    },
  });
  redirectWith(input, { code });
}

export async function approveAuthorization(form: FormData) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const input = readRequest(form);
  const { scopes } = await validateRequest(input);
  await completeAuthorization(input, userId, scopes);
}

export async function reuseAuthorization(form: FormData) {
  // Any explicit prompt (including consent/account selection) keeps the consent
  // screen. A matching display name is never sufficient to trust a new client.
  if (field(form, "prompt").trim()) return;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return;

  const input = readRequest(form);
  const { scopes } = await validateRequest(input);
  const grants = await prisma.oAuthRefreshToken.findMany({
    where: {
      userId,
      clientId: input.clientId,
      resource: input.resource,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { scope: true },
  });
  // Reuse one existing grant only; do not combine unrelated grants or silently
  // add new permissions. Rotation preserves this evidence of prior consent.
  const alreadyApproved = grants.some((grant) => {
    const approved = new Set(grant.scope.split(/\s+/));
    return scopes.every((scope) => approved.has(scope));
  });
  if (alreadyApproved) await completeAuthorization(input, userId, scopes);
}

export async function denyAuthorization(form: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const input = readRequest(form);
  await validateRequest(input);
  redirectWith(input, { error: "access_denied" });
}
