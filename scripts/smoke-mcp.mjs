import { spawn } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

for (const file of [".env", ".env.local", ".env.development.local"]) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split(/\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (!match) continue;
    process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

const port = process.env.MCP_SMOKE_PORT || "4014";
const webPort = process.env.MCP_SMOKE_WEB_PORT || "3314";
const resource = `http://127.0.0.1:${port}/mcp`;
const issuer = `http://127.0.0.1:${webPort}`;
const secret = "lifeos-mcp-smoke-secret-at-least-32-characters";
const serverLogs = [];
let serverProcess;
let webProcess;
let prisma;
let taskId;
let userId;
let clientId;
const idempotencyKey = `smoke-${randomUUID()}`;

function timeoutSignal(ms) {
  if (typeof AbortSignal.timeout === "function") return AbortSignal.timeout(ms);
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

async function waitForServer() {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${resource.replace(/\/mcp$/, "")}/.well-known/oauth-protected-resource`, {
        signal: timeoutSignal(3_000),
      });
      const oauth = await fetch(`${issuer}/.well-known/oauth-authorization-server`, {
        signal: timeoutSignal(3_000),
      });
      if (response.ok && oauth.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
  throw new Error(`Timed out waiting for MCP API\n${serverLogs.slice(-20).join("")}`);
}

async function stopServer() {
  for (const child of [serverProcess, webProcess]) {
    if (!child) continue;
    try {
      if (process.platform === "win32") child.kill("SIGTERM");
      else if (child.pid) process.kill(-child.pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 400));
}

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  prisma = new PrismaClient();
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) throw new Error("MCP smoke test needs at least one local LifeOS user");
  userId = user.id;

  serverProcess = spawn(
    "node_modules/.bin/next",
    ["dev", "apps/api", "--hostname", "127.0.0.1", "--port", port],
    {
      stdio: ["ignore", "pipe", "pipe"],
      detached: process.platform !== "win32",
      env: {
        ...process.env,
        MCP_OAUTH_SECRET: secret,
        MCP_AUTH_ISSUER: issuer,
        MCP_RESOURCE_URL: resource,
      },
    },
  );
  const remember = (chunk) => {
    serverLogs.push(chunk.toString());
    if (serverLogs.length > 80) serverLogs.shift();
  };
  serverProcess.stdout.on("data", remember);
  serverProcess.stderr.on("data", remember);
  webProcess = spawn(
    "node_modules/.bin/next",
    ["dev", "--hostname", "127.0.0.1", "--port", webPort],
    {
      stdio: ["ignore", "pipe", "pipe"],
      detached: process.platform !== "win32",
      env: {
        ...process.env,
        MCP_OAUTH_SECRET: secret,
        MCP_AUTH_ISSUER: issuer,
        MCP_RESOURCE_URL: resource,
        AUTH_URL: issuer,
      },
    },
  );
  webProcess.stdout.on("data", remember);
  webProcess.stderr.on("data", remember);
  await waitForServer();

  const unauthorized = await fetch(resource, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
  });
  if (unauthorized.status !== 401 || !unauthorized.headers.get("www-authenticate")?.includes("resource_metadata")) {
    throw new Error("MCP endpoint did not return the expected OAuth challenge");
  }

  const redirectUri = "http://127.0.0.1:9876/callback";
  const registration = await fetch(`${issuer}/oauth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "LifeOS MCP smoke",
      redirect_uris: [redirectUri],
      token_endpoint_auth_method: "none",
    }),
  });
  const registered = await registration.json();
  clientId = registered.client_id;
  if (registration.status !== 201 || typeof clientId !== "string") {
    throw new Error(`OAuth client registration failed: ${JSON.stringify(registered)}`);
  }

  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const code = randomBytes(48).toString("base64url");
  await prisma.oAuthAuthorizationCode.create({
    data: {
      id: createHash("sha256").update(code).digest("hex"),
      clientId,
      userId,
      redirectUri,
      scope: "lifeos:read lifeos:write lifeos:economy lifeos:ai tasks:write goals:write",
      resource,
      codeChallenge: challenge,
      expiresAt: new Date(Date.now() + 60_000),
    },
  });
  const exchange = await fetch(`${issuer}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
      resource,
    }),
  });
  const tokens = await exchange.json();
  if (!exchange.ok || typeof tokens.access_token !== "string" || typeof tokens.refresh_token !== "string") {
    throw new Error(`OAuth token exchange failed: ${JSON.stringify(tokens)}`);
  }
  const refresh = await fetch(`${issuer}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      refresh_token: tokens.refresh_token,
      resource,
    }),
  });
  const refreshed = await refresh.json();
  if (!refresh.ok || typeof refreshed.access_token !== "string") {
    throw new Error(`OAuth refresh failed: ${JSON.stringify(refreshed)}`);
  }

  const transport = new StreamableHTTPClientTransport(new URL(resource), {
    requestInit: { headers: { Authorization: `Bearer ${refreshed.access_token}` } },
  });
  const client = new Client({ name: "lifeos-smoke", version: "1.0.0" }, { capabilities: {} });
  await client.connect(transport);

  const tools = await client.listTools();
  const expected = [
    "get_dashboard", "list_areas", "list_projects", "list_goals", "list_tasks",
    "list_habits", "list_routines", "search_notes", "get_assets", "get_inventory",
    "create_task", "update_task", "delete_task", "complete_task", "create_goal",
    "create_note", "create_asset_transaction", "pull_gacha", "decision_coach", "upload_media",
  ];
  for (const name of expected) {
    if (!tools.tools.some((tool) => tool.name === name)) throw new Error(`Missing MCP tool: ${name}`);
  }

  const areas = await client.callTool({ name: "list_areas", arguments: {} });
  if (areas.isError || !Array.isArray(areas.structuredContent?.data)) {
    throw new Error(`list_areas failed: ${JSON.stringify(areas)}`);
  }

  const title = `MCP smoke task ${new Date().toISOString()}`;
  const first = await client.callTool({
    name: "create_task",
    arguments: { idempotencyKey, title, priority: 3 },
  });
  taskId = first.structuredContent?.data?.id;
  if (first.isError || typeof taskId !== "string") {
    throw new Error(`create_task failed: ${JSON.stringify(first)}`);
  }

  const replay = await client.callTool({
    name: "create_task",
    arguments: { idempotencyKey, title, priority: 3 },
  });
  if (replay.structuredContent?.data?.id !== taskId) {
    throw new Error("create_task idempotency replay created a different task");
  }

  await client.close();
  if (tools.tools.length < 90) throw new Error(`Expected the complete MCP catalog, found only ${tools.tools.length} tools`);
  console.log(`MCP smoke passed: OAuth registration/code/PKCE/refresh, ${tools.tools.length} tools, read, write, and idempotency`);
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.stack : error);
  if (serverLogs.length) console.error(serverLogs.slice(-25).join(""));
  process.exitCode = 1;
} finally {
  if (prisma && userId) {
    if (taskId) await prisma.task.deleteMany({ where: { id: taskId, userId } }).catch(() => {});
    await prisma.agentAction.deleteMany({ where: { userId, toolName: "create_task", idempotencyKey } }).catch(() => {});
    if (clientId) await prisma.oAuthClient.deleteMany({ where: { id: clientId } }).catch(() => {});
    await prisma.$disconnect();
  }
  await stopServer();
}
