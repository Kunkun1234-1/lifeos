import { spawn } from "node:child_process";

const port = process.env.SMOKE_PORT || "3310";
const baseUrl = process.env.SMOKE_BASE_URL || `http://127.0.0.1:${port}`;
const shouldStartServer = !process.env.SMOKE_BASE_URL;
const cookieJar = new Map();
const serverLogs = [];
let serverProcess = null;

function timeoutSignal(timeoutMs) {
  if (typeof AbortSignal.timeout === "function") return AbortSignal.timeout(timeoutMs);

  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

function splitSetCookie(value) {
  return value ? value.split(/,(?=\s*[^;,=\s]+=[^;,]+)/g).map((v) => v.trim()) : [];
}

function setCookiesFrom(headers) {
  const cookies =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : splitSetCookie(headers.get("set-cookie"));

  for (const cookie of cookies) {
    const [pair] = cookie.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) cookieJar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
}

function cookieHeader() {
  return Array.from(cookieJar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function request(path, init = {}) {
  const headers = new Headers(init.headers);
  const cookies = cookieHeader();
  if (cookies) headers.set("Cookie", cookies);

  const res = await fetch(new URL(path, baseUrl), {
    ...init,
    headers,
    redirect: "manual",
    signal: init.signal || timeoutSignal(15_000),
  });
  setCookiesFrom(res.headers);
  return res;
}

async function readResponse(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

async function waitForServer() {
  const deadline = Date.now() + 45_000;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/login`, {
        redirect: "manual",
        signal: timeoutSignal(5_000),
      });
      if (res.status < 500) return;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  throw new Error(`Timed out waiting for ${baseUrl}: ${lastError?.message ?? "no response"}`);
}

function startServer() {
  serverProcess = spawn(
    "npm",
    ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", port],
    {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, PORT: port },
      detached: process.platform !== "win32",
    },
  );

  const remember = (chunk) => {
    serverLogs.push(chunk.toString());
    if (serverLogs.length > 80) serverLogs.shift();
  };

  serverProcess.stdout.on("data", remember);
  serverProcess.stderr.on("data", remember);
}

async function stopServer() {
  if (!serverProcess) return;

  try {
    if (process.platform === "win32") {
      serverProcess.kill("SIGTERM");
    } else if (serverProcess.pid) {
      process.kill(-serverProcess.pid, "SIGTERM");
    }
  } catch {
    serverProcess.kill("SIGTERM");
  }

  await new Promise((resolve) => setTimeout(resolve, 500));
}

async function signInDev() {
  const csrfRes = await request("/api/auth/csrf");
  if (!csrfRes.ok) {
    throw new Error(`CSRF request failed: ${csrfRes.status} ${JSON.stringify(await readResponse(csrfRes))}`);
  }

  const csrf = await readResponse(csrfRes);
  const form = new URLSearchParams({
    csrfToken: csrf.csrfToken,
    callbackUrl: `${baseUrl}/notes`,
    json: "true",
  });

  const loginRes = await request("/api/auth/callback/dev", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });

  const location = loginRes.headers.get("location") || "";
  if (loginRes.status >= 400 || location.includes("/api/auth/error")) {
    throw new Error(
      [
        `Dev login failed with HTTP ${loginRes.status}${location ? ` -> ${location}` : ""}.`,
        "This smoke test requires a reachable PostgreSQL DATABASE_URL because the dev login creates/loads dev@local.",
        "Use a local/staging Postgres URL before deploying.",
      ].join(" "),
    );
  }

  const probeRes = await request("/api/notes");
  if (!probeRes.ok) {
    throw new Error(`Authenticated notes probe failed: ${probeRes.status} ${JSON.stringify(await readResponse(probeRes))}`);
  }
}

async function smokeNotes() {
  const firstLine = `Smoke note ${new Date().toISOString()}`;
  const createRes = await request("/api/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "note",
      body: `${firstLine}\nBody-only smoke test. The server should derive the title from the first line.`,
      tags: ["smoke-test"],
      pinned: false,
    }),
  });

  if (createRes.status !== 201) {
    throw new Error(`Create note failed: ${createRes.status} ${JSON.stringify(await readResponse(createRes))}`);
  }

  const created = await readResponse(createRes);
  const note = created?.note;
  if (!note?.id || note.title !== firstLine) {
    throw new Error(`Unexpected created note payload: ${JSON.stringify(created)}`);
  }

  const listRes = await request(`/api/notes?q=${encodeURIComponent(firstLine)}`);
  if (!listRes.ok) {
    throw new Error(`List note failed: ${listRes.status} ${JSON.stringify(await readResponse(listRes))}`);
  }

  const notes = await readResponse(listRes);
  if (!Array.isArray(notes) || !notes.some((item) => item.id === note.id)) {
    throw new Error(`Created note was not returned by search: ${JSON.stringify(notes)}`);
  }

  const deleteRes = await request(`/api/notes/${note.id}`, { method: "DELETE" });
  if (!deleteRes.ok) {
    throw new Error(`Cleanup delete failed: ${deleteRes.status} ${JSON.stringify(await readResponse(deleteRes))}`);
  }

  console.log(`Notes smoke passed: body-only note saved as "${firstLine}"`);
}

async function smokeRoutines() {
  const stamp = new Date().toISOString();
  const originalTitle = `Smoke routine ${stamp}`;
  const updatedTitle = `Smoke routine updated ${stamp}`;

  const createRes = await request("/api/routines", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: originalTitle,
      notes: "Routine smoke create",
      daysOfWeek: [1, 3, 5],
      xpReward: 11,
      goldReward: 7,
    }),
  });

  if (createRes.status !== 201) {
    throw new Error(`Create routine failed: ${createRes.status} ${JSON.stringify(await readResponse(createRes))}`);
  }

  const created = await readResponse(createRes);
  if (!created?.id || created.title !== originalTitle) {
    throw new Error(`Unexpected created routine payload: ${JSON.stringify(created)}`);
  }

  const updateRes = await request(`/api/routines/${created.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: updatedTitle,
      notes: "Routine smoke update",
      daysOfWeek: [2, 4],
      xpReward: 21,
      goldReward: 9,
    }),
  });

  if (!updateRes.ok) {
    throw new Error(`Update routine failed: ${updateRes.status} ${JSON.stringify(await readResponse(updateRes))}`);
  }

  const updated = await readResponse(updateRes);
  if (
    updated?.id !== created.id ||
    updated.title !== updatedTitle ||
    updated.notes !== "Routine smoke update" ||
    updated.daysOfWeek !== JSON.stringify([2, 4]) ||
    updated.xpReward !== 21 ||
    updated.goldReward !== 9
  ) {
    throw new Error(`Unexpected updated routine payload: ${JSON.stringify(updated)}`);
  }

  const listRes = await request("/api/routines");
  if (!listRes.ok) {
    throw new Error(`List routines failed: ${listRes.status} ${JSON.stringify(await readResponse(listRes))}`);
  }

  const routines = await readResponse(listRes);
  const listed = Array.isArray(routines)
    ? routines.find((routine) => routine.id === created.id)
    : null;
  if (!listed || listed.title !== updatedTitle || listed.daysOfWeek !== JSON.stringify([2, 4])) {
    throw new Error(`Updated routine was not returned by list: ${JSON.stringify(routines)}`);
  }

  const deleteRes = await request(`/api/routines/${created.id}`, { method: "DELETE" });
  if (!deleteRes.ok) {
    throw new Error(`Cleanup routine delete failed: ${deleteRes.status} ${JSON.stringify(await readResponse(deleteRes))}`);
  }

  console.log(`Routines smoke passed: routine edited as "${updatedTitle}"`);
}

async function main() {
  try {
    if (shouldStartServer) startServer();
    await waitForServer();
    await signInDev();
    await smokeNotes();
    await smokeRoutines();
  } catch (error) {
    console.error(error.message);
    if (serverLogs.length) {
      console.error("\nRecent dev server logs:");
      console.error(serverLogs.join("").slice(-4000));
    }
    process.exitCode = 1;
  } finally {
    await stopServer();
  }
}

await main();
process.exit(process.exitCode ?? 0);
