import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// This probe must never silently inherit a production connection from .env.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !["localhost", "127.0.0.1"].includes(new URL(databaseUrl).hostname)) {
  throw new Error("Explicit local DATABASE_URL is required");
}
const apiOrigin = process.env.PLANNING_SMOKE_BASE_URL ?? "http://127.0.0.1:4000";
if (!["localhost", "127.0.0.1"].includes(new URL(apiOrigin).hostname)) {
  throw new Error("Planning MCP verification only permits a local API");
}
const resource = `${apiOrigin.replace(/\/$/, "")}/mcp`;
const issuer = process.env.MCP_AUTH_ISSUER ?? "http://localhost:3000";
const secret = process.env.MCP_OAUTH_SECRET;
if (!secret || secret.length < 32) throw new Error("Explicit test MCP_OAUTH_SECRET is required");
const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const client = new Client({ name: "planning-verification", version: "1.0.0" }, { capabilities: {} });
let user;
try {
  user = await db.user.create({ data: { email: `planning-mcp-${Date.now()}@local.invalid` } });
  const goal = await db.goal.create({ data: { userId: user.id, objective: "MCP verification", timeframe: "2026 Q4", startDate: new Date("2026-10-01"), endDate: new Date("2026-12-31") } });
  const project = await db.project.create({ data: { userId: user.id, goalId: goal.id, title: "MCP verification" } });
  const token = await new SignJWT({ type: "mcp_access", client_id: "planning-verification", scope: "lifeos:read lifeos:write", resource })
    .setProtectedHeader({ alg: "HS256" }).setSubject(user.id).setIssuer(issuer).setAudience(resource)
    .setIssuedAt().setExpirationTime("5m").sign(new TextEncoder().encode(secret));
  await client.connect(new StreamableHTTPClientTransport(new URL(resource), { requestInit: { headers: { Authorization: `Bearer ${token}` } } }));
  const tools = await client.listTools();
  for (const name of ["get_goal_tree", "get_project_tree", "list_milestones", "get_milestone", "create_milestone", "update_milestone", "delete_milestone"]) {
    assert(tools.tools.some((tool) => tool.name === name), `Missing ${name}`);
  }
  const call = async (name, args) => {
    const result = await client.callTool({ name, arguments: args });
    assert(!result.isError, `${name}: ${JSON.stringify(result)}`);
    return result.structuredContent.data;
  };
  const args = { projectId: project.id, title: "MCP milestone", acceptanceCriteria: "Verify hierarchy", idempotencyKey: "planning-create-milestone-0001" };
  const milestone = await call("create_milestone", args);
  // JSONB may reorder keys: the same arguments must still replay exactly once.
  assert.equal((await call("create_milestone", args)).id, milestone.id);
  const changedArgs = await client.callTool({ name: "create_milestone", arguments: { ...args, title: "Different action" } });
  assert(changedArgs.isError, "Same key with different arguments must be rejected");
  await call("update_milestone", { id: milestone.id, status: "IN_PROGRESS", acceptanceCriteria: "Updated acceptance", idempotencyKey: "planning-update-milestone-0001" });
  assert.equal((await call("get_milestone", { id: milestone.id })).acceptanceCriteria, "Updated acceptance");
  assert.equal((await call("list_milestones", { projectId: project.id })).length, 1);
  assert.equal((await call("get_project_tree", { id: project.id })).milestones[0].id, milestone.id);
  assert.equal((await call("get_goal_tree", { id: goal.id })).projects[0].project.id, project.id);
  await call("delete_milestone", { id: milestone.id, idempotencyKey: "planning-delete-milestone-0001" });
  assert.equal((await call("list_milestones", { projectId: project.id })).length, 0);
  console.log(`Planning MCP passed: ${tools.tools.length} tools; milestone CRUD, tree reads, identical replay and argument conflict`);
} finally {
  await client.close();
  if (user) await db.user.delete({ where: { id: user.id } });
  await db.$disconnect();
}
