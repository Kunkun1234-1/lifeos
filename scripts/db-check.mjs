import dns from "node:dns/promises";
import fs from "node:fs";
import net from "node:net";

const ENV_FILES = [".env", ".env.local", ".env.development.local"];
const CONNECT_TIMEOUT_MS = Number(process.env.DB_CHECK_TIMEOUT_MS ?? 5000);

for (const file of ENV_FILES) {
  if (!fs.existsSync(file)) continue;
  const contents = fs.readFileSync(file, "utf8");
  for (const line of contents.split(/\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    const value = rawValue.trim().replace(/^['"]|['"]$/g, "");
    process.env[key] = value;
  }
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(databaseUrl);
} catch {
  console.error("DATABASE_URL is not a valid URL.");
  process.exit(1);
}

const host = parsed.hostname;
const port = Number(parsed.port || 5432);
const shouldProbeSsl =
  parsed.searchParams.get("sslmode") === "require" || host.endsWith(".neon.tech");

function redactUrl(url) {
  const copy = new URL(url);
  const auth = copy.username
    ? `<user>${copy.password ? ":<password>" : ""}@`
    : "";
  return `${copy.protocol}//${auth}${copy.host}${copy.pathname}${copy.search}`;
}

function isFakeIp(address) {
  return address.startsWith("198.18.") || address.startsWith("198.19.");
}

function connectTcp() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const startedAt = Date.now();
    const finish = (ok, detail) => {
      socket.destroy();
      resolve({ ok, ms: Date.now() - startedAt, detail });
    };
    socket.setTimeout(CONNECT_TIMEOUT_MS);
    socket.once("connect", () => finish(true, "tcp connected"));
    socket.once("timeout", () => finish(false, "tcp timeout"));
    socket.once("error", (error) => finish(false, error.message));
  });
}

function probePostgresSsl() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const startedAt = Date.now();
    const finish = (ok, detail) => {
      socket.destroy();
      resolve({ ok, ms: Date.now() - startedAt, detail });
    };
    socket.setTimeout(CONNECT_TIMEOUT_MS);
    socket.once("connect", () => {
      const sslRequest = Buffer.alloc(8);
      sslRequest.writeInt32BE(8, 0);
      sslRequest.writeInt32BE(80877103, 4);
      socket.write(sslRequest);
    });
    socket.once("data", (chunk) => {
      const response = chunk.toString("utf8", 0, 1);
      if (response === "S") finish(true, "postgres ssl accepted");
      else if (response === "N") finish(false, "postgres ssl rejected");
      else finish(false, `unexpected postgres ssl response: ${JSON.stringify(response)}`);
    });
    socket.once("timeout", () => finish(false, "postgres ssl timeout"));
    socket.once("error", (error) => finish(false, error.message));
    socket.once("end", () => finish(false, "postgres ssl connection closed"));
  });
}

async function queryPrisma() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`select 1 as ok`;
    return { ok: true, ms: Date.now() - startedAt, detail: "select 1 succeeded" };
  } catch (error) {
    return {
      ok: false,
      ms: Date.now() - startedAt,
      detail: `${error.name ?? "Error"}: ${String(error.message).split("\n").at(-1)}`,
    };
  } finally {
    await prisma.$disconnect();
  }
}

console.log(`DATABASE_URL: ${redactUrl(databaseUrl)}`);

const addresses = await dns.lookup(host, { all: true }).catch((error) => {
  console.log(`DNS: failed (${error.message})`);
  return [];
});
if (addresses.length) {
  const resolved = addresses.map((entry) => entry.address).join(", ");
  console.log(`DNS: ${resolved}`);
  if (addresses.some((entry) => isFakeIp(entry.address))) {
    console.log(
      "DNS warning: host resolves to 198.18/15 fake-ip range. Local proxy/DNS may break raw PostgreSQL connections.",
    );
  }
}

const tcp = await connectTcp();
console.log(`TCP: ${tcp.ok ? "ok" : "fail"} (${tcp.ms}ms) ${tcp.detail}`);

if (shouldProbeSsl) {
  const ssl = await probePostgresSsl();
  console.log(`Postgres SSL probe: ${ssl.ok ? "ok" : "fail"} (${ssl.ms}ms) ${ssl.detail}`);
} else {
  console.log("Postgres SSL probe: skipped (sslmode is not required)");
}

const prisma = await queryPrisma();
console.log(`Prisma query: ${prisma.ok ? "ok" : "fail"} (${prisma.ms}ms) ${prisma.detail}`);

if (!prisma.ok) process.exit(1);
