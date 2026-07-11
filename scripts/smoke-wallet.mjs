import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import { SignJWT } from "jose";

loadEnvFile(".env.local");
loadEnvFile(".env");

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();
const port = process.env.WALLET_SMOKE_PORT ?? "4012";
const baseUrl = process.env.WALLET_SMOKE_BASE_URL ?? `http://127.0.0.1:${port}`;
const secretValue =
  process.env.WALLET_SMOKE_SECRET ?? "lifeos-wallet-smoke-secret-at-least-32-chars";
const serverLogs = [];

const server = process.env.WALLET_SMOKE_BASE_URL
  ? null
  : spawn(
      "npm",
      ["run", "start", "--", "--hostname", "127.0.0.1", "--port", port],
      {
        cwd: `${process.cwd()}/apps/api`,
        env: { ...process.env, API_JWT_SECRET: secretValue, NODE_ENV: "test" },
        stdio: ["ignore", "pipe", "pipe"],
        detached: process.platform !== "win32",
      },
    );

if (server) {
  for (const stream of [server.stdout, server.stderr]) {
    stream.on("data", (chunk) => {
      serverLogs.push(chunk.toString());
      if (serverLogs.length > 60) serverLogs.shift();
    });
  }
}

let smokeUserId = null;

try {
  await waitForServer();
  const user = await prisma.user.create({
    data: { email: `wallet-smoke-${Date.now()}@local.invalid`, name: "Wallet Smoke" },
    select: { id: true },
  });
  smokeUserId = user.id;
  const token = await new SignJWT({ type: "api_access" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer("lifeos-web")
    .setAudience("lifeos-api")
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode(secretValue));
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  let wallet = await request("/api/assets", { headers }, 200);
  assert.equal(wallet.pools.length, 3, "wallet must create exactly three pools");
  assert.equal(wallet.plan.initialized, false, "new wallet must require initialization");
  assert.equal(wallet.summary.totalBalanceCents, 0);

  await request(
    "/api/assets/transactions",
    jsonRequest(headers, { type: "income", amountCents: 100 }),
    409,
  );

  await request(
    "/api/assets/initialize",
    jsonRequest(headers, {
      livingTargetCents: 600_000,
      savingsRateBps: 5000,
      livingBalanceCents: 600_000,
      savingsBalanceCents: 200_000,
      flexibleBalanceCents: 200_000,
    }),
    201,
  );
  wallet = await walletSnapshot(headers);
  assertPools(wallet, { living: 600_000, savings: 200_000, flexible: 200_000 });
  assert.equal(wallet.summary.totalBalanceCents, 1_000_000);

  await request(
    "/api/assets/settings",
    jsonRequest(headers, { livingTargetCents: 600_000, savingsRateBps: 6000 }, "PUT"),
    200,
  );
  const income = await request(
    "/api/assets/transactions",
    jsonRequest(headers, { type: "income", amountCents: 100_000, counterparty: "60/40 income" }),
    201,
  );
  assertAllocation(income, { savings: 60_000, flexible: 40_000 });
  wallet = await walletSnapshot(headers);
  assertPools(wallet, { living: 600_000, savings: 260_000, flexible: 240_000 });

  await request(
    "/api/assets/transactions",
    jsonRequest(headers, {
      type: "income",
      amountCents: 10_000,
      allocations: { livingCents: 0, savingsCents: 4_000, flexibleCents: 5_000 },
    }),
    400,
  );
  const manualIncome = await request(
    "/api/assets/transactions",
    jsonRequest(headers, {
      type: "income",
      amountCents: 10_000,
      counterparty: "manual income",
      allocations: { livingCents: 0, savingsCents: 4_000, flexibleCents: 6_000 },
    }),
    201,
  );
  assertAllocation(manualIncome, { savings: 4_000, flexible: 6_000 });
  const editedManualIncome = await request(
    `/api/assets/transactions/${manualIncome.id}`,
    jsonRequest(headers, {
      type: "income",
      amountCents: 10_000,
      counterparty: "manual income edited",
      allocations: { livingCents: 0, savingsCents: 7_000, flexibleCents: 3_000 },
    }, "PATCH"),
    200,
  );
  assert.equal(editedManualIncome.id, manualIncome.id);
  assertAllocation(editedManualIncome, { savings: 7_000, flexible: 3_000 });
  await request(`/api/assets/transactions/${manualIncome.id}`, { method: "DELETE", headers }, 200);

  await request(
    "/api/assets/transactions",
    jsonRequest(headers, {
      type: "expense",
      amountCents: 10_000,
      necessity: "essential",
      sourcePoolType: "flexible",
      acknowledgeWarning: true,
    }),
    400,
  );

  await request(
    "/api/assets/transactions",
    jsonRequest(headers, {
      type: "expense",
      amountCents: 580_000,
      necessity: "essential",
      sourcePoolType: "living",
    }),
    201,
  );
  wallet = await walletSnapshot(headers);
  assertPools(wallet, { living: 20_000, savings: 260_000, flexible: 240_000 });

  const fallbackExpense = {
    type: "expense",
    amountCents: 50_000,
    necessity: "essential",
    sourcePoolType: "flexible",
  };
  await request("/api/assets/transactions", jsonRequest(headers, fallbackExpense), 400);
  await request(
    "/api/assets/transactions",
    jsonRequest(headers, { ...fallbackExpense, acknowledgeWarning: true }),
    201,
  );
  await request(
    "/api/assets/transactions",
    jsonRequest(headers, {
      type: "expense",
      amountCents: 10_000,
      necessity: "optional",
      sourcePoolType: "living",
    }),
    400,
  );
  const optionalExpense = await request(
    "/api/assets/transactions",
    jsonRequest(headers, {
      type: "expense",
      amountCents: 10_000,
      necessity: "optional",
      sourcePoolType: "flexible",
    }),
    201,
  );
  const editedOptionalExpense = await request(
    `/api/assets/transactions/${optionalExpense.id}`,
    jsonRequest(headers, {
      type: "expense",
      amountCents: 12_000,
      necessity: "optional",
      sourcePoolType: "flexible",
      counterparty: "edited optional expense",
    }, "PATCH"),
    200,
  );
  assert.equal(editedOptionalExpense.amountCents, 12_000);
  wallet = await walletSnapshot(headers);
  assertPools(wallet, { living: 20_000, savings: 260_000, flexible: 178_000 });

  const expenseRefund = await request(
    `/api/assets/transactions/${optionalExpense.id}/refund`,
    { method: "POST", headers },
    201,
  );
  assert.equal(expenseRefund.type, "refund");
  assert.equal(expenseRefund.refundOfId, optionalExpense.id);
  wallet = await walletSnapshot(headers);
  assert.equal(wallet.summary.monthRefundCents, 12_000);
  assertPools(wallet, { living: 20_000, savings: 260_000, flexible: 190_000 });
  await request(`/api/assets/transactions/${optionalExpense.id}/refund`, { method: "POST", headers }, 409);
  await request(`/api/assets/transactions/${optionalExpense.id}`, { method: "DELETE", headers }, 409);

  const refundResults = await request("/api/assets/transactions?type=refund", { headers }, 200);
  assert.equal(refundResults.length, 1);
  const filteredExpenses = await request(
    `/api/assets/transactions?type=expense&necessity=optional&pool=flexible&month=${currentMonthKey()}`,
    { headers },
    200,
  );
  assert.ok(filteredExpenses.some((transaction) => transaction.id === optionalExpense.id));
  await request(`/api/assets/transactions/${expenseRefund.id}`, { method: "DELETE", headers }, 200);
  wallet = await walletSnapshot(headers);
  assertPools(wallet, { living: 20_000, savings: 260_000, flexible: 178_000 });

  const transfer = await request(
    "/api/assets/transactions",
    jsonRequest(headers, {
      type: "transfer",
      amountCents: 30_000,
      sourcePoolType: "flexible",
      targetPoolType: "living",
    }),
    201,
  );
  wallet = await walletSnapshot(headers);
  assertPools(wallet, { living: 50_000, savings: 260_000, flexible: 148_000 });
  assert.equal(wallet.summary.totalBalanceCents, 458_000, "transfer must not change wallet total");
  const editedTransfer = await request(
    `/api/assets/transactions/${transfer.id}`,
    jsonRequest(headers, {
      type: "transfer",
      amountCents: 20_000,
      sourcePoolType: "flexible",
      targetPoolType: "living",
    }, "PATCH"),
    200,
  );
  assert.equal(editedTransfer.amountCents, 20_000);
  wallet = await walletSnapshot(headers);
  assertPools(wallet, { living: 40_000, savings: 260_000, flexible: 158_000 });
  await request(`/api/assets/transactions/${transfer.id}`, { method: "DELETE", headers }, 200);
  wallet = await walletSnapshot(headers);
  assertPools(wallet, { living: 20_000, savings: 260_000, flexible: 178_000 });

  const savingsTransfer = {
    type: "transfer",
    amountCents: 10_000,
    sourcePoolType: "savings",
    targetPoolType: "living",
  };
  await request("/api/assets/transactions", jsonRequest(headers, savingsTransfer), 400);
  const confirmedSavingsTransfer = await request(
    "/api/assets/transactions",
    jsonRequest(headers, { ...savingsTransfer, acknowledgeWarning: true }),
    201,
  );
  await request(
    `/api/assets/transactions/${confirmedSavingsTransfer.id}`,
    { method: "DELETE", headers },
    200,
  );

  const refillIncome = await request(
    "/api/assets/transactions",
    jsonRequest(headers, { type: "income", amountCents: 100_000, counterparty: "living refill" }),
    201,
  );
  assertAllocation(refillIncome, { living: 100_000 });
  wallet = await walletSnapshot(headers);
  assertPools(wallet, { living: 120_000, savings: 260_000, flexible: 178_000 });
  await request(`/api/assets/transactions/${refillIncome.id}`, { method: "DELETE", headers }, 200);

  await request(
    "/api/assets/settings",
    jsonRequest(headers, { livingTargetCents: 20_000, savingsRateBps: 5000 }, "PUT"),
    200,
  );
  const roundingIncome = await request(
    "/api/assets/transactions",
    jsonRequest(headers, { type: "income", amountCents: 1 }),
    201,
  );
  assertAllocation(roundingIncome, { flexible: 1 });
  await request(`/api/assets/transactions/${roundingIncome.id}`, { method: "DELETE", headers }, 200);

  for (const [savingsRateBps, expectedPool] of [
    [0, "flexible"],
    [10_000, "savings"],
  ]) {
    await request(
      "/api/assets/settings",
      jsonRequest(headers, { livingTargetCents: 20_000, savingsRateBps }, "PUT"),
      200,
    );
    const boundaryIncome = await request(
      "/api/assets/transactions",
      jsonRequest(headers, { type: "income", amountCents: 100 }),
      201,
    );
    assertAllocation(boundaryIncome, { [expectedPool]: 100 });
    await request(`/api/assets/transactions/${boundaryIncome.id}`, { method: "DELETE", headers }, 200);
  }

  await request(
    "/api/assets/settings",
    jsonRequest(headers, {
      livingTargetCents: 20_000,
      savingsRateBps: 5000,
      carryLivingTarget: false,
    }, "PUT"),
    200,
  );

  const currentPlan = await prisma.walletMonthlyPlan.findFirstOrThrow({ where: { userId: user.id } });
  await prisma.walletMonthlyPlan.update({
    where: { id: currentPlan.id },
    data: { month: previousMonthKey() },
  });
  wallet = await walletSnapshot(headers);
  assert.equal(wallet.plan.rolloverCompleted, false, "new month must require manual rollover");
  assert.equal(wallet.plan.livingTargetCents, 0, "disabled carry-over must reset next month target");
  assert.equal(wallet.plan.carryLivingTarget, false);
  const beforeRolloverTotal = wallet.summary.totalBalanceCents;
  await request(
    "/api/assets/transactions",
    jsonRequest(headers, { type: "income", amountCents: 100 }),
    409,
  );
  const livingBeforeRollover = poolBalance(wallet, "living");
  const flexibleBeforeRollover = poolBalance(wallet, "flexible");
  await request("/api/assets/rollover", { method: "POST", headers }, 200);
  wallet = await walletSnapshot(headers);
  assert.equal(wallet.plan.rolloverCompleted, true);
  assert.equal(poolBalance(wallet, "living"), 0);
  assert.equal(poolBalance(wallet, "flexible"), flexibleBeforeRollover + livingBeforeRollover);
  assert.equal(wallet.summary.totalBalanceCents, beforeRolloverTotal);

  const initialTransaction = wallet.transactions.find(
    (transaction) => transaction.counterparty === "初始资金",
  );
  assert.ok(initialTransaction, "initial allocation snapshot must remain in history");
  assertAllocation(initialTransaction, { living: 600_000, savings: 200_000, flexible: 200_000 });

  console.log("Wallet smoke passed: initialization, manual allocation, editing, refunds, filters, expenses, transfers, rollback, ratio boundaries, rollover, and target carry preference");
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  if (serverLogs.length) console.error(serverLogs.join("").slice(-5000));
  process.exitCode = 1;
} finally {
  if (server) {
    try {
      if (process.platform !== "win32" && server.pid) process.kill(-server.pid, "SIGTERM");
      else server.kill("SIGTERM");
    } catch {
      server.kill("SIGTERM");
    }
  }
  if (smokeUserId) await prisma.user.deleteMany({ where: { id: smokeUserId } });
  await prisma.$disconnect();
}

function jsonRequest(headers, body, method = "POST") {
  return { method, headers, body: JSON.stringify(body) };
}

async function request(path, init, expectedStatus) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = await response.json().catch(() => null);
  assert.equal(
    response.status,
    expectedStatus,
    `${path} returned ${response.status}, expected ${expectedStatus}: ${JSON.stringify(body)}`,
  );
  return body;
}

async function walletSnapshot(headers) {
  return request("/api/assets", { headers }, 200);
}

function assertPools(wallet, expected) {
  for (const [type, balanceCents] of Object.entries(expected)) {
    assert.equal(poolBalance(wallet, type), balanceCents, `${type} pool balance mismatch`);
  }
}

function poolBalance(wallet, type) {
  return wallet.pools.find((pool) => pool.type === type)?.balanceCents;
}

function assertAllocation(transaction, expected) {
  const actual = Object.fromEntries(
    transaction.allocations
      .filter((allocation) => allocation.amountCents > 0)
      .map((allocation) => [allocation.pool.type, allocation.amountCents]),
  );
  assert.deepEqual(actual, expected);
}

function previousMonthKey(now = new Date()) {
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonthKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function waitForServer() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/assets`);
      if (response.status === 401) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for wallet smoke API");
}

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
}
