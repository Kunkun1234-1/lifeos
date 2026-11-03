import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
import { jwtVerify } from "jose";

// Run against the local Web/API already running, with explicitly loaded env.
const issuer = process.env.MCP_AUTH_ISSUER;
const resource = process.env.MCP_RESOURCE_URL;
for (const value of [process.env.DATABASE_URL, issuer, resource]) {
  assert(value && ["localhost", "127.0.0.1"].includes(new URL(value).hostname),
    "OAuth regression tests require explicit local DATABASE_URL, MCP_AUTH_ISSUER and MCP_RESOURCE_URL");
}
assert(process.env.AUTH_SECRET && process.env.MCP_OAUTH_SECRET);
const db = new PrismaClient();
const hash = (value) => createHash("sha256").update(value).digest("hex");
const opaque = () => randomBytes(48).toString("base64url");
const redirectUri = "http://127.0.0.1:9876/callback";
const users = [];
const clients = [];

async function makeUser() {
  const user = await db.user.create({ data: { email: `oauth-test-${opaque()}@local.invalid` } });
  users.push(user.id);
  const session = await encode({
    token: { sub: user.id, userId: user.id },
    secret: process.env.AUTH_SECRET,
    salt: "authjs.session-token",
    maxAge: 600,
  });
  return { id: user.id, cookie: `authjs.session-token=${session}` };
}

async function register() {
  const res = await fetch(`${issuer}/oauth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_name: "OAuth regression", redirect_uris: [redirectUri] }),
  });
  assert.equal(res.status, 201);
  const { client_id } = await res.json();
  clients.push(client_id);
  return client_id;
}

async function token(body, expected = 200) {
  const res = await fetch(`${issuer}/oauth/token`, { method: "POST", body: new URLSearchParams(body) });
  const data = await res.json();
  // Never print successful token responses or credential-bearing request bodies.
  assert.equal(res.status, expected, data.error_description ?? "Unexpected token status");
  return data;
}

async function authorize(user, clientId, overrides = {}) {
  const verifier = opaque();
  const params = new URLSearchParams({
    client_id: clientId, redirect_uri: redirectUri, response_type: "code",
    resource, scope: "lifeos:read", state: opaque(),
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256", ...overrides,
  });
  const res = await fetch(`${issuer}/oauth/authorize?${params}`, {
    headers: user ? { Cookie: user.cookie } : {}, redirect: "manual",
  });
  const html = await res.text();
  // Next may stream the redirect after the shell; both forms must lead to the
  // same registered callback. Never follow that callback in a regression test.
  const streamed = html.match(/<meta[^>]+http-equiv="refresh"[^>]+content="\d+;url=([^"<>]+)"/i);
  const location = res.headers.get("location") ?? streamed?.[1]?.replaceAll("&amp;", "&");
  return { res, html, location, verifier, state: params.get("state") };
}

function needsConsent(result) {
  assert.equal(result.location, undefined, "Unexpected automatic authorization");
  assert(result.html.includes("允许连接"), "Consent form was not rendered");
}

try {
  const user = await makeUser();
  const other = await makeUser();
  const clientId = await register();
  needsConsent(await authorize(user, clientId));
  const login = await authorize(null, clientId);
  assert(new URL(login.location, issuer).pathname === "/login");

  // Seed only an already-approved grant. First-time consent is checked above.
  const refreshToken = opaque();
  const grant = await db.oAuthRefreshToken.create({ data: {
    id: hash(refreshToken), userId: user.id, clientId, scope: "lifeos:read lifeos:write",
    resource, expiresAt: new Date(Date.now() + 600_000),
  } });
  const reused = await authorize(user, clientId);
  assert(reused.location, "An existing grant should avoid repeat consent");
  const callback = new URL(reused.location);
  assert.equal(callback.origin + callback.pathname, redirectUri);
  assert.equal(callback.searchParams.get("state"), reused.state);
  const code = callback.searchParams.get("code");
  assert(code);
  const exchange = { grant_type: "authorization_code", client_id: clientId, code,
    redirect_uri: redirectUri, code_verifier: reused.verifier };
  await token({ ...exchange, code_verifier: opaque() }, 400);
  await token(exchange);
  await token(exchange, 400); // Codes remain single use.
  needsConsent(await authorize(user, clientId, { prompt: "consent" }));
  needsConsent(await authorize(user, clientId, { scope: "lifeos:read lifeos:ai" }));
  needsConsent(await authorize(other, clientId));
  const otherClient = await register();
  needsConsent(await authorize(user, otherClient)); // Same display name is not trust.
  const badRedirect = await authorize(user, clientId, { redirect_uri: "https://example.invalid/callback" });
  assert(!badRedirect.location && badRedirect.html.includes("无法授权此连接"));

  const refresh = { grant_type: "refresh_token", client_id: clientId, refresh_token: refreshToken };
  await token({ ...refresh, resource: "https://example.invalid/mcp" }, 400);
  await token({ ...refresh, resource: "" }, 400);
  await token({ ...refresh, client_id: otherClient }, 400);
  const refreshed = await token(refresh); // No repeated resource parameter.
  assert.notEqual(refreshed.refresh_token, refreshToken);
  const verified = await jwtVerify(refreshed.access_token, new TextEncoder().encode(process.env.MCP_OAUTH_SECRET), {
    issuer, audience: resource,
  });
  assert.equal(verified.payload.sub, user.id);
  assert.equal(verified.payload.scope, grant.scope);
  await token(refresh, 400); // Old refresh tokens cannot be replayed.
  const next = { ...refresh, refresh_token: refreshed.refresh_token, resource };
  // Concurrent refreshes must issue exactly one replacement pair.
  const concurrent = await Promise.all([0, 1].map(() => fetch(`${issuer}/oauth/token`, {
    method: "POST", body: new URLSearchParams(next),
  })));
  assert.deepEqual(concurrent.map((r) => r.status).sort(), [200, 400]);
  await Promise.all(concurrent.map((r) => r.arrayBuffer()));

  // Revoked and expired grants must no longer suppress consent.
  await db.oAuthRefreshToken.updateMany({ where: { clientId }, data: { revokedAt: new Date() } });
  needsConsent(await authorize(user, clientId));
  await db.oAuthRefreshToken.updateMany({ where: { clientId }, data: { revokedAt: null, expiresAt: new Date(0) } });
  needsConsent(await authorize(user, clientId));
  await token(refresh, 400);
  const unauthorized = await fetch(resource, { headers: { Authorization: "Bearer invalid-token" } });
  assert.equal(unauthorized.status, 401);
  assert(unauthorized.headers.get("www-authenticate").includes('error="invalid_token"'));
  console.log("OAuth regression passed: consent reuse, new scopes/accounts/clients, prompt, PKCE, audience, refresh without resource, rotation, concurrency, replay, revocation and expiry.");
} finally {
  await db.oAuthClient.deleteMany({ where: { id: { in: clients } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
}
