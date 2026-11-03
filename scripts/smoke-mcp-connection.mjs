import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
import { jwtVerify } from "jose";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// Exercise the client-visible discovery -> consent form -> token -> tool path.
// Never seed OAuth codes/grants or run against a production account/database.
const issuer = process.env.MCP_AUTH_ISSUER;
const resource = process.env.MCP_RESOURCE_URL;
for (const value of [process.env.DATABASE_URL, issuer, resource]) {
  assert(value && ["localhost", "127.0.0.1"].includes(new URL(value).hostname), "Explicit local services and database are required");
}
assert(process.env.AUTH_SECRET && process.env.MCP_OAUTH_SECRET);
const scopes = ["lifeos:read", "lifeos:write", "lifeos:economy", "lifeos:ai"];
const db = new PrismaClient();
const clients = [];
const connections = [];
let user;
const opaque = () => randomBytes(48).toString("base64url");
const decodeHtml = (s) => s.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">");

async function consent(scope, cookie, existingClientId) {
  const redirectUri = "http://127.0.0.1:9876/callback";
  let clientId = existingClientId;
  if (!clientId) {
    const registered = await fetch(`${issuer}/oauth/register`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_name: "MCP connection regression", redirect_uris: [redirectUri] }),
    });
    assert.equal(registered.status, 201);
    clientId = (await registered.json()).client_id;
    clients.push(clientId);
  }
  const verifier = opaque();
  const params = new URLSearchParams({
    client_id: clientId, redirect_uri: redirectUri, response_type: "code", resource, scope,
    state: opaque(), code_challenge_method: "S256",
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
  });
  const url = `${issuer}/oauth/authorize?${params}`;
  const page = await fetch(url, { headers: { Cookie: cookie }, redirect: "manual" });
  const html = await page.text();
  const formHtml = [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)].map((m) => m[0]).find((form) => form.includes("允许连接"));
  assert(formHtml, "New or expanded scopes must render the real consent form");
  const form = new FormData();
  for (const match of formHtml.matchAll(/<input\b[^>]*>/g)) {
    const name = match[0].match(/\bname="([^"]*)"/);
    const value = match[0].match(/\bvalue="([^"]*)"/);
    if (name) form.append(decodeHtml(name[1]), decodeHtml(value?.[1] ?? ""));
  }
  assert([...form.keys()].some((key) => key.startsWith("$ACTION_")), "Consent server action must be present");
  assert.equal(form.get("scope"), scope);
  const approved = await fetch(url, {
    method: "POST", headers: { Cookie: cookie, Origin: issuer }, body: form, redirect: "manual",
  });
  const location = approved.headers.get("location");
  assert.equal(approved.status, 303, "Consent form submission must redirect to the client");
  const callback = new URL(location);
  assert.equal(callback.origin + callback.pathname, redirectUri);
  assert.equal(callback.searchParams.get("state"), params.get("state"));
  assert(callback.searchParams.get("code"));
  const exchanged = await fetch(`${issuer}/oauth/token`, {
    method: "POST", body: new URLSearchParams({
      grant_type: "authorization_code", client_id: clientId,
      code: callback.searchParams.get("code"), redirect_uri: redirectUri, code_verifier: verifier, resource,
    }),
  });
  assert.equal(exchanged.status, 200);
  const tokens = await exchanged.json();
  assert.equal(tokens.scope, scope);
  const verified = await jwtVerify(tokens.access_token, new TextEncoder().encode(process.env.MCP_OAUTH_SECRET), { issuer, audience: resource });
  assert.equal(verified.payload.scope, scope);
  assert.equal(verified.payload.sub, user.id);
  return { clientId, tokens };
}

async function connect(token) {
  const client = new Client({ name: "connection-regression", version: "1" }, { capabilities: {} });
  connections.push(client);
  await client.connect(new StreamableHTTPClientTransport(new URL(resource), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
  }));
  return client;
}

async function call(client, name, args) {
  const result = await client.callTool({ name, arguments: args });
  assert(!result.isError, `${name}: ${JSON.stringify(result)}`);
  return result.structuredContent.data;
}

try {
  const challenge = await fetch(resource);
  assert.equal(challenge.status, 401);
  const requested = challenge.headers.get("www-authenticate").match(/\bscope="([^"]+)"/)[1];
  assert.deepEqual(requested.split(" "), scopes, "Initial connection must request all four functional scopes");
  user = await db.user.create({ data: { email: `mcp-connection-${randomUUID()}@local.invalid` } });
  const session = await encode({ token: { sub: user.id, userId: user.id }, secret: process.env.AUTH_SECRET, salt: "authjs.session-token", maxAge: 600 });
  const cookie = `authjs.session-token=${session}`;
  const full = await consent(requested, cookie);
  const client = await connect(full.tokens.access_token);
  const { tools } = await client.listTools();
  for (const tool of tools) {
    assert.equal(tool.inputSchema.type, "object", tool.name);
    assert(tool._meta?.securitySchemes?.[0]?.scopes?.length, `${tool.name} needs OAuth metadata`);
    if (!tool.annotations?.readOnlyHint) {
      assert(tool.inputSchema.properties?.idempotencyKey, `${tool.name} has an empty/incomplete descriptor`);
      assert(tool.inputSchema.required?.includes("idempotencyKey"), tool.name);
    }
  }
  for (const [name, fields] of Object.entries({
    create_note: ["title", "body", "idempotencyKey"], update_note: ["id", "title", "body", "idempotencyKey"],
    delete_note: ["id", "idempotencyKey"], upload_media: ["fileName", "mimeType", "base64", "idempotencyKey"],
    create_asset_transaction: ["type", "amountCents", "necessity", "sourcePoolType", "targetPoolType", "allocations"],
    create_milestone: ["projectId", "title", "startDate", "deadline"], decision_coach: ["decisionId", "draft"],
  })) {
    const tool = tools.find((t) => t.name === name);
    for (const field of fields) assert(tool?.inputSchema.properties?.[field], `${name}.${field} is missing`);
  }
  const key = randomUUID();
  const { note } = await call(client, "create_note", { title: "Temporary MCP regression note", body: "before", idempotencyKey: key });
  assert(note.id);
  assert.equal((await call(client, "create_note", { title: "Temporary MCP regression note", body: "before", idempotencyKey: key })).note.id, note.id);
  const updated = await call(client, "update_note", { id: note.id, title: "Updated temporary note", body: "after", idempotencyKey: randomUUID() });
  assert.equal(updated.body, "after");
  await call(client, "delete_note", { id: note.id, idempotencyKey: randomUUID() });
  assert((await db.note.findUniqueOrThrow({ where: { id: note.id } })).deletedAt);
  await call(client, "permanently_delete_note", { id: note.id, idempotencyKey: randomUUID() });
  assert.equal(await db.note.findUnique({ where: { id: note.id } }), null);

  await call(client, "initialize_wallet", { livingBalanceCents: 0, savingsBalanceCents: 0, flexibleBalanceCents: 0, livingTargetCents: 10000, savingsRateBps: 0, carryLivingTarget: true, idempotencyKey: randomUUID() });
  await call(client, "create_asset_transaction", { type: "income", amountCents: 1000, idempotencyKey: randomUUID() });
  await call(client, "create_asset_transaction", { type: "expense", amountCents: 1, necessity: "essential", sourcePoolType: "living", idempotencyKey: randomUUID() });
  const invalidTransfer = await client.callTool({ name: "create_asset_transaction", arguments: { type: "transfer", amountCents: 1, sourcePoolType: "living", idempotencyKey: randomUUID() } });
  assert(invalidTransfer.isError && JSON.stringify(invalidTransfer).includes("targetPoolType"), "Conditional union requirements must still be enforced");
  const invalidCoach = await client.callTool({ name: "decision_coach", arguments: { idempotencyKey: randomUUID() } });
  assert(invalidCoach.isError && JSON.stringify(invalidCoach).includes("Provide decisionId or draft"), "AI scope must pass auth but cross-field validation must still run without calling the model");
  const invalidMilestone = await client.callTool({ name: "create_milestone", arguments: { projectId: "invalid", title: "invalid", startDate: "2026-11-04T00:00:00Z", deadline: "2026-11-03T00:00:00Z", idempotencyKey: randomUUID() } });
  assert(invalidMilestone.isError && JSON.stringify(invalidMilestone).includes("deadline cannot be before"));

  // An intentionally read-only connection must stay read-only, including after
  // refresh, and return a structured upgrade challenge without any mutation.
  const readOnly = await consent("lifeos:read", cookie);
  const readClient = await connect(readOnly.tokens.access_token);
  await call(readClient, "list_tasks", {});
  const before = await db.agentAction.count({ where: { userId: user.id } });
  for (const name of ["create_note", "buy_freeze", "weekly_coach", "upload_media"]) {
    const args = { idempotencyKey: randomUUID(), ...(name === "create_note" ? { title: "Must not create" } : {}), ...(name === "upload_media" ? { fileName: "test.png", mimeType: "image/png", base64: "AAAA" } : {}) };
    const blocked = await readClient.callTool({ name, arguments: args });
    assert(blocked.isError, `${name} must reject read-only tokens`);
    const challenges = blocked._meta?.["mcp/www_authenticate"];
    assert(challenges?.[0]?.includes('error="insufficient_scope"'), `${name} must trigger OAuth upgrade UI`);
    assert(challenges[0].includes(`scope="${requested}"`));
  }
  assert.equal(await db.agentAction.count({ where: { userId: user.id } }), before);
  assert.equal(await db.note.count({ where: { userId: user.id, title: "Must not create" } }), 0);
  const refresh = await fetch(`${issuer}/oauth/token`, { method: "POST", body: new URLSearchParams({ grant_type: "refresh_token", client_id: readOnly.clientId, refresh_token: readOnly.tokens.refresh_token }) });
  assert.equal(refresh.status, 200);
  assert.equal((await refresh.json()).scope, "lifeos:read", "Refresh must never silently add scopes");
  const upgraded = await consent(requested, cookie, readOnly.clientId);
  assert.equal(upgraded.tokens.scope, requested);
  const upgradedClient = await connect(upgraded.tokens.access_token);
  const upgradedNote = await call(upgradedClient, "create_note", { title: "After explicit permission upgrade", idempotencyKey: randomUUID() });
  assert(upgradedNote.note.id);
  console.log(`MCP connection passed: discovery -> real consent -> four-scope grant; ${tools.length} tool descriptors; note create/update/trash/purge + replay; wallet union inputs; runtime refinements; read-only isolation and explicit scope upgrade. No external AI calls.`);
} finally {
  await Promise.allSettled(connections.map((client) => client.close()));
  await db.oAuthClient.deleteMany({ where: { id: { in: clients } } });
  if (user) await db.user.delete({ where: { id: user.id } });
  await db.$disconnect();
}
