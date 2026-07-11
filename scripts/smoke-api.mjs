import { spawn } from "node:child_process";
import fs from "node:fs";
import { SignJWT } from "jose";

loadEnvFile(".env.local");
loadEnvFile(".env");

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

const port = process.env.API_SMOKE_PORT ?? "4011";
const baseUrl = `http://127.0.0.1:${port}`;
const secretValue =
  process.env.API_JWT_SECRET ?? "lifeos-api-smoke-secret-at-least-32-chars";
const serverLogs = [];

const server = spawn(
  "npm",
  [
    "run",
    "start",
    "--workspace",
    "@lifeos/api",
    "--",
    "--hostname",
    "127.0.0.1",
    "--port",
    port,
  ],
  {
  cwd: process.cwd(),
  env: {
    ...process.env,
    API_JWT_SECRET: secretValue,
    NODE_ENV: "test",
  },
  stdio: ["ignore", "pipe", "pipe"],
  detached: process.platform !== "win32",
  },
);

for (const stream of [server.stdout, server.stderr]) {
  stream.on("data", (chunk) => {
    serverLogs.push(chunk.toString());
    if (serverLogs.length > 50) serverLogs.shift();
  });
}

async function waitForServer() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for independent API");
}

async function expectJson(path, init, expectedStatus) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = await response.json().catch(() => null);
  if (response.status !== expectedStatus) {
    throw new Error(
      `${path} returned ${response.status}, expected ${expectedStatus}: ${JSON.stringify(body)}`,
    );
  }
  return body;
}

async function main() {
  let smokeUserId = null;
  try {
    await waitForServer();
    await expectJson("/ready", {}, 200);
    await expectJson("/api/areas", {}, 401);

    const smokeUser = await prisma.user.upsert({
      where: { email: "api-smoke@local.invalid" },
      create: { email: "api-smoke@local.invalid", name: "API Smoke" },
      update: {},
      select: { id: true },
    });
    smokeUserId = smokeUser.id;

    const token = await new SignJWT({ type: "api_access" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(smokeUser.id)
      .setIssuer("lifeos-web")
      .setAudience("lifeos-api")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(new TextEncoder().encode(secretValue));
    const headers = { Authorization: `Bearer ${token}` };

    const readEndpoints = [
      "/api/user",
      "/api/dashboard",
      "/api/achievements",
      "/api/analytics",
      "/api/assets",
      "/api/battlepass",
      "/api/commissions/today",
      "/api/decisions",
      "/api/equipment",
      "/api/events",
      "/api/freeze",
      "/api/gacha",
      "/api/goals",
      "/api/habits",
      "/api/inventory",
      "/api/notes",
      "/api/principles",
      "/api/projects",
      "/api/resin",
      "/api/review",
      "/api/rewards",
      "/api/routines",
      "/api/titles",
    ];
    for (const endpoint of readEndpoints) {
      await expectJson(endpoint, { headers }, 200);
    }

    const areas = await expectJson("/api/areas", { headers }, 200);
    const tasks = await expectJson("/api/tasks", { headers }, 200);
    if (!Array.isArray(areas) || !Array.isArray(tasks)) {
      throw new Error("Migrated list endpoints did not return arrays");
    }

    const task = await expectJson(
      "/api/tasks",
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "API migration smoke task",
          xpReward: 0,
          goldReward: 0,
        }),
      },
      201,
    );
    const updated = await expectJson(
      `/api/tasks/${task.id}`,
      {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ title: "API migration smoke task updated" }),
      },
      200,
    );
    if (updated.title !== "API migration smoke task updated") {
      throw new Error("Task PATCH did not persist its update");
    }

    const completionRequests = [1, 2].map(() =>
      fetch(`${baseUrl}/api/tasks/${task.id}/complete`, {
        method: "POST",
        headers,
      }),
    );
    const completionResponses = await Promise.all(completionRequests);
    const completionStatuses = completionResponses.map((response) => response.status).sort();
    if (completionStatuses[0] !== 200 || completionStatuses[1] !== 409) {
      throw new Error(
        `Concurrent completion was not idempotent: ${completionStatuses.join(", ")}`,
      );
    }
    await expectJson(`/api/tasks/${task.id}`, { method: "DELETE", headers }, 200);

    console.log(
      `Independent API smoke passed: ${readEndpoints.length} modules + CRUD + concurrent completion (${completionStatuses.join("/")})`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    if (serverLogs.length) console.error(serverLogs.join("").slice(-4000));
    process.exitCode = 1;
  } finally {
    try {
      if (process.platform !== "win32" && server.pid) {
        process.kill(-server.pid, "SIGTERM");
      } else {
        server.kill("SIGTERM");
      }
    } catch {
      server.kill("SIGTERM");
    }
    if (smokeUserId) {
      await prisma.user.deleteMany({ where: { id: smokeUserId } });
    }
    await prisma.$disconnect();
  }
}

await main();

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
}
