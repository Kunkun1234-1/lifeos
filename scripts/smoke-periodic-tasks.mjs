import assert from "node:assert/strict";
import crypto from "node:crypto";
import { SignJWT } from "jose";

const databaseUrl = requireLocalDatabaseUrl();
const baseUrl = requireLocalBaseUrl();
const secretValue =
  process.env.API_JWT_SECRET ??
  "lifeos-planning-local-jwt-secret-only-for-tests";

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: databaseUrl } },
});

async function requestJson(pathname, init = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, init);
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function expectJson(pathname, init, expectedStatus) {
  const result = await requestJson(pathname, init);
  assert.equal(
    result.response.status,
    expectedStatus,
    `${pathname} returned ${result.response.status}, expected ${expectedStatus}: ${JSON.stringify(result.body)}`,
  );
  return result.body;
}

function jsonInit(method, headers, body) {
  return {
    method,
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

async function createAccessToken(userId) {
  return new SignJWT({ type: "api_access" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer("lifeos-web")
    .setAudience("lifeos-api")
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode(secretValue));
}

function todayInShanghai() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(ymd, amount) {
  const value = new Date(`${ymd}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function priorMonday(ymd, weeksBack = 1) {
  const value = new Date(`${ymd}T00:00:00.000Z`);
  const weekday = value.getUTCDay();
  value.setUTCDate(value.getUTCDate() + (weekday === 0 ? -6 : 1 - weekday) - 7 * weeksBack);
  return value.toISOString().slice(0, 10);
}

async function rewardSnapshot(userId, areaId) {
  const [xp, currency, area] = await Promise.all([
    prisma.xpLedger.aggregate({ where: { userId }, _sum: { amount: true } }),
    prisma.currency.findUnique({ where: { userId }, select: { gold: true } }),
    prisma.area.findUnique({ where: { id: areaId }, select: { attributeXp: true } }),
  ]);
  return {
    xp: xp._sum.amount ?? 0,
    gold: currency?.gold ?? 0,
    areaXp: area?.attributeXp ?? 0,
  };
}

function assertDesiredStateResult(result, { completed, already }) {
  assert.equal(result.completed, completed);
  assert.equal(
    result.already,
    already,
    `check-in should report already=${already}: ${JSON.stringify(result)}`,
  );
  assert.equal(result.changed, !already);
  assert.equal(result.task.completed, completed);
}

async function main() {
  const createdUserIds = [];
  const runId = crypto.randomUUID();

  try {
    await expectJson("/health", {}, 200);
    await expectJson("/ready", {}, 200);

    const [owner, outsider] = await Promise.all([
      prisma.user.create({
        data: {
          email: `periodic-owner-${runId}@local.invalid`,
          name: "Periodic Smoke Owner",
          timezone: "Asia/Shanghai",
        },
        select: { id: true },
      }),
      prisma.user.create({
        data: {
          email: `periodic-outsider-${runId}@local.invalid`,
          name: "Periodic Smoke Outsider",
          timezone: "Asia/Shanghai",
        },
        select: { id: true },
      }),
    ]);
    createdUserIds.push(owner.id, outsider.id);

    const [ownerToken, outsiderToken] = await Promise.all([
      createAccessToken(owner.id),
      createAccessToken(outsider.id),
    ]);
    const ownerHeaders = { Authorization: `Bearer ${ownerToken}` };
    const outsiderHeaders = { Authorization: `Bearer ${outsiderToken}` };

    const [ownerArea, outsiderArea] = await Promise.all([
      prisma.area.create({
        data: {
          userId: owner.id,
          name: "周期任务测试领域",
          attributeKey: "INT",
        },
      }),
      prisma.area.create({
        data: {
          userId: outsider.id,
          name: "他人领域",
          attributeKey: "STR",
        },
      }),
    ]);

    await expectJson("/api/periodic-tasks?frequency=YEARLY", { headers: ownerHeaders }, 400);
    await expectJson(
      "/api/periodic-tasks?frequency=DAILY&date=2026-02-30",
      { headers: ownerHeaders },
      400,
    );
    await expectJson(
      "/api/periodic-tasks",
      jsonInit("POST", ownerHeaders, { title: "非法频率", frequency: "YEARLY" }),
      400,
    );
    await expectJson(
      "/api/periodic-tasks",
      jsonInit("POST", ownerHeaders, {
        title: "不可关联他人领域",
        frequency: "DAILY",
        areaId: outsiderArea.id,
      }),
      400,
    );

    const today = todayInShanghai();
    await expectJson(
      `/api/periodic-tasks?frequency=DAILY&date=${addDays(today, 1)}`,
      { headers: ownerHeaders },
      400,
    );
    await expectJson(
      `/api/periodic-tasks/week?date=${addDays(today, 1)}`,
      { headers: ownerHeaders },
      400,
    );

    const created = {};
    for (const frequency of ["DAILY", "WEEKLY", "MONTHLY"]) {
      const task = await expectJson(
        "/api/periodic-tasks",
        jsonInit("POST", ownerHeaders, {
          title: `${frequency} ${runId}`,
          notes: `${frequency} CRUD smoke`,
          frequency,
          areaId: ownerArea.id,
          xpReward: frequency === "DAILY" ? 17 : 3,
          goldReward: frequency === "DAILY" ? 9 : 2,
        }),
        201,
      );
      assert.equal(task.frequency, frequency);
      assert.equal(task.completed, false);
      created[frequency] = task;
    }

    const editedMonthly = await expectJson(
      `/api/periodic-tasks/${created.MONTHLY.id}`,
      jsonInit("PATCH", ownerHeaders, {
        title: `MONTHLY edited ${runId}`,
        xpReward: 7,
        goldReward: 4,
      }),
      200,
    );
    assert.equal(editedMonthly.title, `MONTHLY edited ${runId}`);
    assert.equal(editedMonthly.xpReward, 7);

    const initialWeek = await expectJson(
      "/api/periodic-tasks/week",
      { headers: ownerHeaders },
      200,
    );
    assert.equal(initialWeek.days.length, 7);
    assert.equal(initialWeek.days[0], initialWeek.periodStart);
    assert.equal(initialWeek.days[6], initialWeek.periodEnd);
    assert.deepEqual(
      initialWeek.days,
      Array.from({ length: 7 }, (_value, index) =>
        addDays(initialWeek.periodStart, index),
      ),
      "week view must return consecutive Monday-through-Sunday dates",
    );
    const initialDaily = initialWeek.tasks.find(
      (task) => task.id === created.DAILY.id,
    );
    assert(initialDaily, "week view must include the owner's daily task");
    assert.equal(initialDaily.availableFrom, today);
    assert.equal(initialDaily.completed, false);
    assert.deepEqual(initialDaily.completedDates, []);
    assert(
      !initialWeek.tasks.some(
        (task) => task.id === created.WEEKLY.id || task.id === created.MONTHLY.id,
      ),
      "week view must not mix weekly or monthly templates into daily tasks",
    );

    await expectJson(
      `/api/periodic-tasks/${created.DAILY.id}`,
      jsonInit("PATCH", outsiderHeaders, { title: "越权修改" }),
      404,
    );
    await expectJson(
      `/api/periodic-tasks/${created.DAILY.id}/check-in`,
      jsonInit("POST", outsiderHeaders, { completed: true }),
      404,
    );
    const outsiderList = await expectJson(
      "/api/periodic-tasks?frequency=DAILY",
      { headers: outsiderHeaders },
      200,
    );
    assert(!outsiderList.tasks.some((task) => task.id === created.DAILY.id));
    const outsiderWeek = await expectJson(
      "/api/periodic-tasks/week",
      { headers: outsiderHeaders },
      200,
    );
    assert(
      !outsiderWeek.tasks.some((task) => task.id === created.DAILY.id),
      "week view must isolate tasks by owner",
    );

    if (today < initialWeek.periodEnd) {
      const futureOnly = await expectJson(
        "/api/periodic-tasks",
        jsonInit("POST", ownerHeaders, {
          title: `future-column guard ${runId}`,
          frequency: "DAILY",
          areaId: ownerArea.id,
          xpReward: 1,
          goldReward: 1,
        }),
        201,
      );
      const futureDate = addDays(today, 1);
      await prisma.periodicTaskCheckIn.create({
        data: {
          taskId: futureOnly.id,
          frequency: "DAILY",
          periodKey: futureDate,
          xpGranted: 1,
          goldGranted: 1,
          areaId: ownerArea.id,
          completedAt: new Date(`${futureDate}T04:00:00.000Z`),
        },
      });
      const guardedWeek = await expectJson(
        "/api/periodic-tasks/week",
        { headers: ownerHeaders },
        200,
      );
      const guardedTask = guardedWeek.tasks.find((task) => task.id === futureOnly.id);
      assert(guardedTask, "future-column guard task must remain visible");
      assert.deepEqual(
        guardedTask.completedDates,
        [],
        "future columns must not expose completion state",
      );
    }

    const beforeDaily = await rewardSnapshot(owner.id, ownerArea.id);
    const dailyPeriod = await expectJson(
      "/api/periodic-tasks?frequency=DAILY",
      { headers: ownerHeaders },
      200,
    );
    const concurrent = await Promise.all([
      expectJson(
        `/api/periodic-tasks/${created.DAILY.id}/check-in`,
        jsonInit("POST", ownerHeaders, {
          completed: true,
          periodKey: dailyPeriod.periodStart,
        }),
        200,
      ),
      expectJson(
        `/api/periodic-tasks/${created.DAILY.id}/check-in`,
        jsonInit("POST", ownerHeaders, {
          completed: true,
          periodKey: dailyPeriod.periodStart,
        }),
        200,
      ),
    ]);
    assert.equal(concurrent.filter((result) => result.already === false).length, 1);
    assert.equal(concurrent.filter((result) => result.already === true).length, 1);

    const dailyCheckIns = await prisma.periodicTaskCheckIn.findMany({
      where: { taskId: created.DAILY.id, periodKey: dailyPeriod.periodStart },
    });
    assert.equal(dailyCheckIns.length, 1, "concurrent completion must create one check-in");
    const dailyLedger = await prisma.xpLedger.findMany({
      where: { userId: owner.id, sourceId: dailyCheckIns[0].id },
    });
    assert.deepEqual(dailyLedger.map((entry) => entry.amount), [17]);
    assert.deepEqual(await rewardSnapshot(owner.id, ownerArea.id), {
      xp: beforeDaily.xp + 17,
      gold: beforeDaily.gold + 9,
      areaXp: beforeDaily.areaXp + 17,
    });
    const completedWeek = await expectJson(
      "/api/periodic-tasks/week",
      { headers: ownerHeaders },
      200,
    );
    const completedDaily = completedWeek.tasks.find(
      (task) => task.id === created.DAILY.id,
    );
    assert.equal(completedDaily?.completed, true);
    assert.deepEqual(completedDaily?.completedDates, [today]);

    const repeatedCompletion = await expectJson(
      `/api/periodic-tasks/${created.DAILY.id}/check-in`,
      jsonInit("POST", ownerHeaders, { completed: true }),
      200,
    );
    assertDesiredStateResult(repeatedCompletion, { completed: true, already: true });
    assert.equal(repeatedCompletion.reward, null);
    assert.equal(
      await prisma.xpLedger.count({
        where: { userId: owner.id, sourceId: dailyCheckIns[0].id },
      }),
      1,
    );

    await expectJson(
      `/api/periodic-tasks/${created.DAILY.id}/check-in`,
      jsonInit("POST", ownerHeaders, {
        completed: true,
        periodKey: addDays(dailyPeriod.periodStart, -1),
      }),
      409,
    );
    await expectJson(
      `/api/periodic-tasks/${created.DAILY.id}/check-in`,
      jsonInit("POST", ownerHeaders, {
        completed: true,
        periodKey: addDays(dailyPeriod.periodStart, 1),
      }),
      409,
    );

    await expectJson(
      `/api/periodic-tasks/${created.DAILY.id}`,
      jsonInit("PATCH", ownerHeaders, { xpReward: 999, goldReward: 888 }),
      200,
    );
    const undone = await expectJson(
      `/api/periodic-tasks/${created.DAILY.id}/check-in`,
      jsonInit("POST", ownerHeaders, { completed: false }),
      200,
    );
    assertDesiredStateResult(undone, { completed: false, already: false });
    assert.equal(undone.reward.xpGranted, -17);
    assert.equal(undone.reward.goldGranted, -9);
    assert.deepEqual(
      (await prisma.xpLedger.findMany({
        where: { userId: owner.id, sourceId: dailyCheckIns[0].id },
        orderBy: { createdAt: "asc" },
      })).map((entry) => entry.amount),
      [17, -17],
      "undo must use the saved grant snapshot and record a negative delta",
    );
    assert.deepEqual(await rewardSnapshot(owner.id, ownerArea.id), beforeDaily);
    const undoneWeek = await expectJson(
      "/api/periodic-tasks/week",
      { headers: ownerHeaders },
      200,
    );
    const undoneDaily = undoneWeek.tasks.find(
      (task) => task.id === created.DAILY.id,
    );
    assert.equal(undoneDaily?.completed, false);
    assert.deepEqual(undoneDaily?.completedDates, []);

    const repeatedUndo = await expectJson(
      `/api/periodic-tasks/${created.DAILY.id}/check-in`,
      jsonInit("POST", ownerHeaders, { completed: false }),
      200,
    );
    assertDesiredStateResult(repeatedUndo, { completed: false, already: true });
    assert.equal(repeatedUndo.reward, null);
    assert.deepEqual(await rewardSnapshot(owner.id, ownerArea.id), beforeDaily);

    const priorWeek = priorMonday(today);
    const historicalDaily = await expectJson(
      "/api/periodic-tasks",
      jsonInit("POST", ownerHeaders, {
        title: `historical daily ${runId}`,
        frequency: "DAILY",
        areaId: ownerArea.id,
        xpReward: 6,
        goldReward: 3,
      }),
      201,
    );
    const historicalAvailableFrom = addDays(priorWeek, 2);
    const historicalCompletedDates = [
      historicalAvailableFrom,
      addDays(priorWeek, 4),
    ];
    await prisma.periodicTask.update({
      where: { id: historicalDaily.id },
      data: {
        createdAt: new Date(`${historicalAvailableFrom}T04:00:00.000Z`),
        frequency: "MONTHLY",
        archived: true,
      },
    });
    await prisma.periodicTaskCheckIn.createMany({
      data: historicalCompletedDates.map((periodKey) => ({
        taskId: historicalDaily.id,
        frequency: "DAILY",
        periodKey,
        xpGranted: historicalDaily.xpReward,
        goldGranted: historicalDaily.goldReward,
        areaId: ownerArea.id,
        completedAt: new Date(`${periodKey}T04:00:00.000Z`),
      })),
    });
    const historicalDailyWeek = await expectJson(
      `/api/periodic-tasks/week?date=${priorWeek}`,
      { headers: ownerHeaders },
      200,
    );
    const projectedHistory = historicalDailyWeek.tasks.find(
      (task) => task.id === historicalDaily.id,
    );
    assert(projectedHistory, "historical daily check-ins must survive archive and frequency edits");
    assert.equal(projectedHistory.frequency, "DAILY");
    assert.equal(projectedHistory.availableFrom, historicalAvailableFrom);
    assert.deepEqual(projectedHistory.completedDates, historicalCompletedDates);
    assert(
      !historicalDailyWeek.tasks.some((task) => task.id === created.DAILY.id),
      "tasks created after a historical week must not appear in that week",
    );
    assert(
      !historicalDailyWeek.tasks.some(
        (task) => task.id === created.WEEKLY.id || task.id === created.MONTHLY.id,
      ),
      "historical daily week view must not mix weekly or monthly templates",
    );
    const outsiderHistoricalWeek = await expectJson(
      `/api/periodic-tasks/week?date=${priorWeek}`,
      { headers: outsiderHeaders },
      200,
    );
    assert(
      !outsiderHistoricalWeek.tasks.some((task) => task.id === historicalDaily.id),
      "historical week view must isolate tasks by owner",
    );

    const historicalCompletedAt = new Date(`${addDays(priorWeek, 2)}T04:00:00.000Z`);
    await prisma.periodicTask.update({
      where: { id: created.WEEKLY.id },
      data: { createdAt: new Date(`${addDays(priorWeek, -1)}T04:00:00.000Z`) },
    });
    await prisma.periodicTaskCheckIn.create({
      data: {
        taskId: created.WEEKLY.id,
        frequency: "WEEKLY",
        periodKey: priorWeek,
        xpGranted: created.WEEKLY.xpReward,
        goldGranted: created.WEEKLY.goldReward,
        areaId: ownerArea.id,
        completedAt: historicalCompletedAt,
      },
    });
    const history = await expectJson(
      `/api/periodic-tasks?frequency=WEEKLY&date=${priorWeek}`,
      { headers: ownerHeaders },
      200,
    );
    assert.equal(history.tasks.find((task) => task.id === created.WEEKLY.id)?.completed, true);
    const currentWeek = await expectJson(
      "/api/periodic-tasks?frequency=WEEKLY",
      { headers: ownerHeaders },
      200,
    );
    assert.equal(
      currentWeek.tasks.find((task) => task.id === created.WEEKLY.id)?.completed,
      false,
      "a new weekly period must reset completion without changing system time",
    );
    await expectJson(
      `/api/periodic-tasks/${created.WEEKLY.id}/check-in`,
      jsonInit("POST", ownerHeaders, { completed: false, periodKey: priorWeek }),
      409,
    );

    const parallelTasks = await Promise.all([
      expectJson(
        "/api/periodic-tasks",
        jsonInit("POST", ownerHeaders, {
          title: `parallel A ${runId}`,
          frequency: "DAILY",
          areaId: ownerArea.id,
          xpReward: 11,
          goldReward: 5,
        }),
        201,
      ),
      expectJson(
        "/api/periodic-tasks",
        jsonInit("POST", ownerHeaders, {
          title: `parallel B ${runId}`,
          frequency: "DAILY",
          areaId: ownerArea.id,
          xpReward: 13,
          goldReward: 7,
        }),
        201,
      ),
    ]);
    const beforeParallel = await rewardSnapshot(owner.id, ownerArea.id);
    const parallelResults = await Promise.all(
      parallelTasks.map((task) =>
        expectJson(
          `/api/periodic-tasks/${task.id}/check-in`,
          jsonInit("POST", ownerHeaders, { completed: true }),
          200,
        ),
      ),
    );
    parallelResults.forEach((result) =>
      assertDesiredStateResult(result, { completed: true, already: false }),
    );
    assert.deepEqual(await rewardSnapshot(owner.id, ownerArea.id), {
      xp: beforeParallel.xp + 24,
      gold: beforeParallel.gold + 12,
      areaXp: beforeParallel.areaXp + 24,
    });

    const monthlyCompletion = await expectJson(
      `/api/periodic-tasks/${created.MONTHLY.id}/check-in`,
      jsonInit("POST", ownerHeaders, { completed: true }),
      200,
    );
    assertDesiredStateResult(monthlyCompletion, { completed: true, already: false });
    const monthlyCheckInCount = await prisma.periodicTaskCheckIn.count({
      where: { taskId: created.MONTHLY.id },
    });
    await expectJson(
      `/api/periodic-tasks/${created.MONTHLY.id}`,
      { method: "DELETE", headers: ownerHeaders },
      200,
    );
    assert.equal(
      await prisma.periodicTaskCheckIn.count({ where: { taskId: created.MONTHLY.id } }),
      monthlyCheckInCount,
      "archive must preserve check-in history",
    );
    const monthlyAfterArchive = await expectJson(
      "/api/periodic-tasks?frequency=MONTHLY",
      { headers: ownerHeaders },
      200,
    );
    assert(
      !monthlyAfterArchive.tasks.some((task) => task.id === created.MONTHLY.id),
      "archived tasks must leave the active period list",
    );

    console.log(
      "Periodic task API smoke passed: CRUD, three frequencies, daily week projection, isolation, validation, current-only mutation, history, rollover, archive retention, reward snapshots, idempotency and concurrency verified",
    );
  } finally {
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await prisma.$disconnect();
  }
}

function requireLocalBaseUrl() {
  const raw = process.env.PERIODIC_TASKS_SMOKE_BASE_URL;
  if (!raw) {
    throw new Error(
      "PERIODIC_TASKS_SMOKE_BASE_URL must be explicitly set to a localhost API URL",
    );
  }
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("PERIODIC_TASKS_SMOKE_BASE_URL is not a valid URL");
  }
  if (parsed.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(parsed.hostname)) {
    throw new Error(
      "PERIODIC_TASKS_SMOKE_BASE_URL must use HTTP on localhost or 127.0.0.1",
    );
  }
  return raw.replace(/\/$/, "");
}

function requireLocalDatabaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error(
      "DATABASE_URL must be explicitly set to a temporary PostgreSQL database on localhost or 127.0.0.1",
    );
  }
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("DATABASE_URL is not a valid URL");
  }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error("DATABASE_URL must use the postgres or postgresql protocol");
  }
  if (!["localhost", "127.0.0.1"].includes(parsed.hostname)) {
    throw new Error(
      `Refusing non-local DATABASE_URL host ${JSON.stringify(parsed.hostname)}`,
    );
  }
  if (!parsed.pathname || parsed.pathname === "/") {
    throw new Error("DATABASE_URL must name an explicit temporary local database");
  }
  return raw;
}

await main();
