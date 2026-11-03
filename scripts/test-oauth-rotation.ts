import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { POST } from "../src/app/oauth/token/route";
import { prisma } from "../src/lib/prisma";
import { hashOpaqueToken, pkceChallenge } from "../src/lib/mcp-auth";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  assert(databaseUrl && ["localhost", "127.0.0.1"].includes(new URL(databaseUrl).hostname),
    "Explicit local DATABASE_URL is required");
  const secret = process.env.MCP_OAUTH_SECRET;
  assert(secret && secret.length >= 32);
  const resource = process.env.MCP_RESOURCE_URL!;
  assert(resource && ["localhost", "127.0.0.1"].includes(new URL(resource).hostname));
  const suffix = randomBytes(16).toString("hex");
  const clientId = `oauth-rollback-${suffix}`;
  const redirectUri = "http://127.0.0.1:9876/callback";
  const user = await prisma.user.create({ data: { email: `${clientId}@local.invalid` } });
  const request = (values: Record<string, string>) => POST(new Request("http://localhost/oauth/token", {
    method: "POST", body: new URLSearchParams({ client_id: clientId, resource, ...values }),
  }));
  try {
    await prisma.oAuthClient.create({ data: {
      id: clientId, name: "OAuth rollback test", redirectUris: [redirectUri],
      grantTypes: ["authorization_code", "refresh_token"],
    } });
    const refresh = randomBytes(48).toString("base64url");
    const grant = { clientId, userId: user.id, scope: "lifeos:read", resource,
      expiresAt: new Date(Date.now() + 600_000) };
    const stored = await prisma.oAuthRefreshToken.create({ data: { ...grant, id: hashOpaqueToken(refresh) } });
    const values = { grant_type: "refresh_token", refresh_token: refresh };

    // Simulate signing failing after the database write in this test process
    // only. The running local servers keep their real configuration.
    process.env.MCP_OAUTH_SECRET = "invalid";
    await assert.rejects(request(values), /signing is not configured/);
    assert.equal((await prisma.oAuthRefreshToken.findUniqueOrThrow({ where: { id: stored.id } })).revokedAt, null);
    assert.equal(await prisma.oAuthRefreshToken.count({ where: { clientId } }), 1);
    process.env.MCP_OAUTH_SECRET = secret;
    assert.equal((await request(values)).status, 200, "A failed rotation must remain retryable");

    const verifier = randomBytes(48).toString("base64url");
    const code = randomBytes(48).toString("base64url");
    await prisma.oAuthAuthorizationCode.create({ data: {
      ...grant, id: hashOpaqueToken(code), redirectUri, codeChallenge: pkceChallenge(verifier),
    } });
    const exchange = { grant_type: "authorization_code", code, redirect_uri: redirectUri, code_verifier: verifier };
    const before = await prisma.oAuthRefreshToken.count({ where: { clientId } });
    process.env.MCP_OAUTH_SECRET = "invalid";
    await assert.rejects(request(exchange), /signing is not configured/);
    assert(await prisma.oAuthAuthorizationCode.findUnique({ where: { id: hashOpaqueToken(code) } }));
    assert.equal(await prisma.oAuthRefreshToken.count({ where: { clientId } }), before);
    process.env.MCP_OAUTH_SECRET = secret;
    assert.equal((await request(exchange)).status, 200, "A failed exchange must remain retryable");
    console.log("OAuth transaction tests passed: signing failure preserves refresh tokens and authorization codes; both can be retried.");
  } finally {
    process.env.MCP_OAUTH_SECRET = secret;
    await prisma.oAuthClient.deleteMany({ where: { id: clientId } });
    await prisma.user.delete({ where: { id: user.id } });
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
