import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { SignJWT } from "jose";

const databaseUrl = requireLocalDatabaseUrl();
const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: databaseUrl } },
});

const port = process.env.PLANNING_SMOKE_PORT ?? "4018";
const suppliedBaseUrl = process.env.PLANNING_SMOKE_BASE_URL;
const baseUrl = suppliedBaseUrl
  ? requireLocalBaseUrl(suppliedBaseUrl)
  : `http://127.0.0.1:${port}`;
const secretValue =
  process.env.API_JWT_SECRET ?? "lifeos-planning-smoke-secret-at-least-32-chars";
const serverLogs = [];
const apiDirectory = path.join(process.cwd(), "apps", "api");
const hasApiBuild = fs.existsSync(path.join(apiDirectory, ".next", "BUILD_ID"));
const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const serverMode = suppliedBaseUrl ? "external" : hasApiBuild ? "start" : "dev";

const server = suppliedBaseUrl
  ? null
  : spawn(
      process.execPath,
      [nextBin, serverMode, "--hostname", "127.0.0.1", "--port", port],
      {
        cwd: apiDirectory,
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
          API_JWT_SECRET: secretValue,
          NODE_ENV: hasApiBuild ? "test" : "development",
        },
        stdio: ["ignore", "pipe", "pipe"],
        detached: process.platform !== "win32",
      },
    );

if (server) {
  for (const stream of [server.stdout, server.stderr]) {
    stream.on("data", (chunk) => {
      serverLogs.push(chunk.toString());
      if (serverLogs.length > 80) serverLogs.shift();
    });
  }
}

async function waitForServer() {
  const deadline = Date.now() + (serverMode === "dev" ? 60_000 : 25_000);
  while (Date.now() < deadline) {
    if (server && server.exitCode !== null) {
      throw new Error(`API server exited early with code ${server.exitCode}`);
    }
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      // The API is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for API in ${serverMode} mode`);
}

async function requestJson(pathname, init = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, init);
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function expectJson(pathname, init, expectedStatus) {
  const { response, body } = await requestJson(pathname, init);
  if (response.status !== expectedStatus) {
    throw new Error(
      `${pathname} returned ${response.status}, expected ${expectedStatus}: ${JSON.stringify(body)}`,
    );
  }
  return body;
}

function assert(condition, message, value) {
  if (!condition) {
    throw new Error(`${message}${value === undefined ? "" : `: ${JSON.stringify(value)}`}`);
  }
}

function jsonInit(method, headers, body) {
  return {
    method,
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function unwrap(value, key) {
  return value?.[key] ?? value;
}

function findProjectTree(goalTree, projectId) {
  return goalTree?.projects?.find((entry) => entry?.project?.id === projectId);
}

async function expectSingleConcurrentParentReward({
  pathname,
  responseKey,
  headers,
  userId,
  sourceId,
  expectedXp,
}) {
  const attempts = await Promise.all([
    requestJson(pathname, jsonInit("PATCH", headers, { status: "done" })),
    requestJson(pathname, jsonInit("PATCH", headers, { status: "done" })),
  ]);
  const statuses = attempts.map(({ response }) => response.status).sort((a, b) => a - b);
  assert(
    statuses[0] === 200 && statuses[1] === 409,
    `${responseKey} concurrent completion should have one winner and one conflict`,
    statuses,
  );

  const winner = attempts.find(({ response }) => response.status === 200)?.body;
  assert(
    winner?.[responseKey]?.status === "done" &&
      winner?.reward?.xpGranted === expectedXp,
    `${responseKey} completion winner did not receive the expected reward`,
    winner,
  );

  const rewardEntries = await prisma.xpLedger.findMany({
    where: { userId, source: "bonus", sourceId },
    select: { amount: true },
  });
  assert(
    rewardEntries.length === 1 && rewardEntries[0].amount === expectedXp,
    `${responseKey} concurrent completion created duplicate rewards`,
    rewardEntries,
  );
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

async function main() {
  const createdUserIds = [];
  const runId = crypto.randomUUID();
  let owner;
  let outsider;

  try {
    await waitForServer();
    await expectJson("/ready", {}, 200);

    [owner, outsider] = await Promise.all([
      prisma.user.create({
        data: { email: `planning-owner-${runId}@local.invalid`, name: "Planning Smoke Owner" },
        select: { id: true },
      }),
      prisma.user.create({
        data: { email: `planning-outsider-${runId}@local.invalid`, name: "Planning Smoke Outsider" },
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

    const goal = await expectJson(
      "/api/goals",
      jsonInit("POST", ownerHeaders, {
        objective: "交付四层规划系统",
        notes: "planning smoke goal",
        timeframe: "2026 Q4",
        startDate: "2026-10-01T00:00:00.000Z",
        endDate: "2026-12-31T00:00:00.000Z",
      }),
      201,
    );
    const outsiderGoal = await expectJson(
      "/api/goals",
      jsonInit("POST", outsiderHeaders, {
        objective: "隔离测试目标",
        timeframe: "2026 Q4",
        startDate: "2026-10-01T00:00:00.000Z",
        endDate: "2026-12-31T00:00:00.000Z",
      }),
      201,
    );

    await expectJson(
      "/api/projects",
      jsonInit("POST", ownerHeaders, {
        title: "不可归属他人目标",
        goalId: outsiderGoal.id,
        status: "active",
      }),
      400,
    );
    await expectJson(
      "/api/projects",
      jsonInit("POST", outsiderHeaders, {
        title: "不可归属所有者目标",
        goalId: goal.id,
        status: "active",
      }),
      400,
    );

    const projectA = await expectJson(
      "/api/projects",
      jsonInit("POST", ownerHeaders, {
        title: "规划系统一期",
        deliverable: "完成目标到任务的闭环",
        goalId: goal.id,
        status: "active",
      }),
      201,
    );
    const projectB = await expectJson(
      "/api/projects",
      jsonInit("POST", ownerHeaders, {
        title: "规划系统二期",
        deliverable: "验证阶段迁移",
        goalId: goal.id,
        status: "active",
      }),
      201,
    );

    const unclassifiedTask = await expectJson(
      "/api/tasks",
      jsonInit("POST", ownerHeaders, {
        title: "历史未归类任务",
        projectId: projectA.id,
        xpReward: 0,
        goldReward: 0,
      }),
      201,
    );
    assert(unclassifiedTask.milestoneId === null, "Legacy task should remain unclassified", unclassifiedTask);

    const milestoneA = unwrap(
      await expectJson(
        "/api/milestones",
        jsonInit("POST", ownerHeaders, {
          projectId: projectA.id,
          title: "完成数据模型",
          notes: "initial milestone",
          acceptanceCriteria: "四层关系可创建、读取、更新和删除",
          status: "TODO",
          order: 3,
          startDate: "2026-10-08T00:00:00.000Z",
          deadline: "2026-10-15T00:00:00.000Z",
        }),
        201,
      ),
      "milestone",
    );
    assert(
      milestoneA.acceptanceCriteria === "四层关系可创建、读取、更新和删除" &&
        milestoneA.order === 3 &&
        milestoneA.status === "TODO",
      "Milestone acceptance fields were not persisted on create",
      milestoneA,
    );

    const autoOrderedMilestone = unwrap(
      await expectJson(
        "/api/milestones",
        jsonInit("POST", ownerHeaders, {
          projectId: projectA.id,
          title: "自动排列的下一阶段",
          acceptanceCriteria: "未指定顺序时排在当前最大顺序之后",
          status: "TODO",
        }),
        201,
      ),
      "milestone",
    );
    assert(
      autoOrderedMilestone.order === 4,
      "Milestone without an explicit order should use the current maximum plus one",
      autoOrderedMilestone,
    );

    const milestoneB = unwrap(
      await expectJson(
        "/api/milestones",
        jsonInit("POST", ownerHeaders, {
          projectId: projectB.id,
          title: "二期基线",
          acceptanceCriteria: "迁移后的关联一致",
          status: "IN_PROGRESS",
          order: 0,
        }),
        201,
      ),
      "milestone",
    );

    const linkedTask = await expectJson(
      "/api/tasks",
      jsonInit("POST", ownerHeaders, {
        title: "验证树形关联",
        milestoneId: milestoneA.id,
        xpReward: 17,
        goldReward: 9,
      }),
      201,
    );
    assert(
      linkedTask.projectId === projectA.id && linkedTask.milestoneId === milestoneA.id,
      "Task was not linked to its project and milestone",
      linkedTask,
    );

    const reassignedTask = await expectJson(
      "/api/tasks",
      jsonInit("POST", ownerHeaders, {
        title: "更换项目时解除旧里程碑",
        milestoneId: milestoneA.id,
        xpReward: 0,
        goldReward: 0,
      }),
      201,
    );
    const taskAfterProjectChange = await expectJson(
      `/api/tasks/${reassignedTask.id}`,
      jsonInit("PATCH", ownerHeaders, { projectId: projectB.id }),
      200,
    );
    assert(
      taskAfterProjectChange.projectId === projectB.id &&
        taskAfterProjectChange.milestoneId === null,
      "Changing a task's project should clear its old milestone association",
      taskAfterProjectChange,
    );

    const parentStatusTask = await expectJson(
      "/api/tasks",
      jsonInit("POST", ownerHeaders, {
        title: "完成任务不自动完成父层",
        milestoneId: milestoneB.id,
        xpReward: 0,
        goldReward: 0,
      }),
      201,
    );

    await expectJson(
      "/api/tasks",
      jsonInit("POST", ownerHeaders, {
        title: "拒绝错误父级",
        projectId: projectB.id,
        milestoneId: milestoneA.id,
      }),
      400,
    );

    await expectJson(`/api/goals/${goal.id}/tree`, { headers: outsiderHeaders }, 404);
    await expectJson(`/api/projects/${projectA.id}/tree`, { headers: outsiderHeaders }, 404);
    await expectJson(`/api/milestones/${milestoneA.id}`, { headers: outsiderHeaders }, 404);
    await expectJson(
      "/api/milestones",
      jsonInit("POST", outsiderHeaders, {
        projectId: projectA.id,
        title: "不可挂到他人项目",
        acceptanceCriteria: "必须被拒绝",
      }),
      400,
    );
    await expectJson(
      "/api/tasks",
      jsonInit("POST", outsiderHeaders, {
        title: "不可使用他人父级",
        projectId: projectA.id,
        milestoneId: milestoneA.id,
      }),
      400,
    );

    const projectTree = await expectJson(
      `/api/projects/${projectA.id}/tree`,
      { headers: ownerHeaders },
      200,
    );
    assert(projectTree.project?.id === projectA.id, "Project tree has the wrong root", projectTree);
    assert(
      projectTree.milestones?.some((item) => item.id === milestoneA.id),
      "Project tree is missing its milestone",
      projectTree,
    );
    assert(
      projectTree.tasks?.some(
        (item) => item.id === linkedTask.id && item.milestoneId === milestoneA.id,
      ),
      "Project tree is missing its milestone task",
      projectTree,
    );
    assert(
      projectTree.tasks?.some(
        (item) => item.id === unclassifiedTask.id && item.milestoneId === null,
      ),
      "Project tree is missing its unclassified legacy task",
      projectTree,
    );

    const goalTree = await expectJson(
      `/api/goals/${goal.id}/tree`,
      { headers: ownerHeaders },
      200,
    );
    const projectAInGoal = findProjectTree(goalTree, projectA.id);
    assert(goalTree.goal?.id === goal.id, "Goal tree has the wrong root", goalTree);
    assert(projectAInGoal, "Goal tree is missing its project", goalTree);
    assert(
      projectAInGoal.milestones?.some((item) => item.id === milestoneA.id) &&
        projectAInGoal.tasks?.some((item) => item.id === linkedTask.id),
      "Goal tree does not preserve the project, milestone, and task association",
      projectAInGoal,
    );

    const updatedMilestone = unwrap(
      await expectJson(
        `/api/milestones/${milestoneA.id}`,
        jsonInit("PATCH", ownerHeaders, {
          title: "完成并验收数据模型",
          acceptanceCriteria: "树接口与关联约束全部通过",
          status: "IN_PROGRESS",
          order: 7,
          deadline: "2026-10-20T00:00:00.000Z",
        }),
        200,
      ),
      "milestone",
    );
    assert(
      updatedMilestone.title === "完成并验收数据模型" &&
        updatedMilestone.acceptanceCriteria === "树接口与关联约束全部通过" &&
        updatedMilestone.status === "IN_PROGRESS" &&
        updatedMilestone.order === 7,
      "Milestone PATCH did not return the persisted update",
      updatedMilestone,
    );

    const persistedMilestone = unwrap(
      await expectJson(`/api/milestones/${milestoneA.id}`, { headers: ownerHeaders }, 200),
      "milestone",
    );
    assert(
      persistedMilestone.title === "完成并验收数据模型" &&
        persistedMilestone.acceptanceCriteria === "树接口与关联约束全部通过",
      "Milestone update was not persisted",
      persistedMilestone,
    );

    const updatedTask = await expectJson(
      `/api/tasks/${linkedTask.id}`,
      jsonInit("PATCH", ownerHeaders, {
        title: "验证树形关联与更新",
        notes: "update persistence marker",
      }),
      200,
    );
    assert(
      updatedTask.title === "验证树形关联与更新" &&
        updatedTask.notes === "update persistence marker",
      "Task PATCH did not persist its update",
      updatedTask,
    );

    const movedMilestone = unwrap(
      await expectJson(
        `/api/milestones/${milestoneA.id}`,
        jsonInit("PATCH", ownerHeaders, { projectId: projectB.id }),
        200,
      ),
      "milestone",
    );
    assert(
      movedMilestone.projectId === projectB.id && movedMilestone.order === 1,
      "Milestone move should append after the target project's maximum order",
      movedMilestone,
    );

    const projectBAfterMove = await expectJson(
      `/api/projects/${projectB.id}/tree`,
      { headers: ownerHeaders },
      200,
    );
    assert(
      projectBAfterMove.tasks?.some(
        (item) =>
          item.id === linkedTask.id &&
          item.projectId === projectB.id &&
          item.milestoneId === milestoneA.id,
      ),
      "Moving a milestone did not keep its tasks in a consistent project",
      projectBAfterMove,
    );
    const projectAAfterMove = await expectJson(
      `/api/projects/${projectA.id}/tree`,
      { headers: ownerHeaders },
      200,
    );
    assert(
      !projectAAfterMove.milestones?.some((item) => item.id === milestoneA.id) &&
        !projectAAfterMove.tasks?.some((item) => item.id === linkedTask.id),
      "Moved milestone or task remained in the old project tree",
      projectAAfterMove,
    );

    await expectJson(
      `/api/milestones/${milestoneA.id}`,
      { method: "DELETE", headers: ownerHeaders },
      200,
    );
    const projectBAfterDelete = await expectJson(
      `/api/projects/${projectB.id}/tree`,
      { headers: ownerHeaders },
      200,
    );
    const taskAfterMilestoneDelete = projectBAfterDelete.tasks?.find(
      (item) => item.id === linkedTask.id,
    );
    assert(
      taskAfterMilestoneDelete?.projectId === projectB.id &&
        taskAfterMilestoneDelete?.milestoneId === null,
      "Deleting a milestone should retain its tasks as unclassified",
      projectBAfterDelete,
    );

    const completion = await expectJson(
      `/api/tasks/${linkedTask.id}/complete`,
      { method: "POST", headers: ownerHeaders },
      200,
    );
    assert(
      completion.task?.status === "DONE" &&
        completion.reward?.xpGranted === 17 &&
        completion.reward?.goldGranted === 9,
      "Task completion did not grant the configured reward",
      completion,
    );
    await expectJson(
      `/api/tasks/${linkedTask.id}/complete`,
      { method: "POST", headers: ownerHeaders },
      409,
    );
    const rewardEntries = await prisma.xpLedger.findMany({
      where: {
        userId: owner.id,
        source: "task",
        sourceId: linkedTask.id,
      },
      select: { amount: true },
    });
    assert(
      rewardEntries.length === 1 && rewardEntries[0].amount === 17,
      "Duplicate completion created duplicate XP rewards",
      rewardEntries,
    );

    await expectJson(
      `/api/tasks/${parentStatusTask.id}/complete`,
      { method: "POST", headers: ownerHeaders },
      200,
    );
    const parentStatusTree = await expectJson(
      `/api/goals/${goal.id}/tree`,
      { headers: ownerHeaders },
      200,
    );
    const projectBParentStatus = findProjectTree(parentStatusTree, projectB.id);
    assert(
      parentStatusTree.goal?.status === "active" &&
        projectBParentStatus?.project?.status === "active" &&
        projectBParentStatus?.milestones?.some(
          (item) => item.id === milestoneB.id && item.status === "IN_PROGRESS",
        ),
      "Completing a task should not automatically complete its milestone, project, or goal",
      parentStatusTree,
    );

    await expectSingleConcurrentParentReward({
      pathname: `/api/projects/${projectB.id}`,
      responseKey: "project",
      headers: ownerHeaders,
      userId: owner.id,
      sourceId: projectB.id,
      expectedXp: 100,
    });
    const repeatedProjectCompletion = await expectJson(
      `/api/projects/${projectB.id}`,
      jsonInit("PATCH", ownerHeaders, { status: "done" }),
      200,
    );
    assert(
      repeatedProjectCompletion.project?.status === "done" &&
        repeatedProjectCompletion.reward === null,
      "Repeated project completion should be a no-op without another reward",
      repeatedProjectCompletion,
    );
    await expectJson(
      `/api/projects/${projectB.id}`,
      jsonInit("PATCH", ownerHeaders, { status: "paused" }),
      409,
    );
    const editedDoneProject = await expectJson(
      `/api/projects/${projectB.id}`,
      jsonInit("PATCH", ownerHeaders, { title: "规划系统二期（已验收）" }),
      200,
    );
    assert(
      editedDoneProject.project?.title === "规划系统二期（已验收）" &&
        editedDoneProject.project?.status === "done" &&
        editedDoneProject.reward === null,
      "A completed project should remain editable without another reward",
      editedDoneProject,
    );

    await expectSingleConcurrentParentReward({
      pathname: `/api/goals/${goal.id}`,
      responseKey: "goal",
      headers: ownerHeaders,
      userId: owner.id,
      sourceId: goal.id,
      expectedXp: 500,
    });
    const repeatedGoalCompletion = await expectJson(
      `/api/goals/${goal.id}`,
      jsonInit("PATCH", ownerHeaders, { status: "done" }),
      200,
    );
    assert(
      repeatedGoalCompletion.goal?.status === "done" &&
        repeatedGoalCompletion.reward === null,
      "Repeated goal completion should be a no-op without another reward",
      repeatedGoalCompletion,
    );
    await expectJson(
      `/api/goals/${goal.id}`,
      jsonInit("PATCH", ownerHeaders, { status: "active" }),
      409,
    );
    const editedDoneGoal = await expectJson(
      `/api/goals/${goal.id}`,
      jsonInit("PATCH", ownerHeaders, { objective: "交付并持续维护四层规划系统" }),
      200,
    );
    assert(
      editedDoneGoal.goal?.objective === "交付并持续维护四层规划系统" &&
        editedDoneGoal.goal?.status === "done" &&
        editedDoneGoal.reward === null,
      "A completed goal should remain editable without another reward",
      editedDoneGoal,
    );

    const stillExistingMilestone = await expectJson(
      `/api/milestones/${milestoneB.id}`,
      { headers: ownerHeaders },
      200,
    );
    assert(unwrap(stillExistingMilestone, "milestone").projectId === projectB.id, "Control milestone was lost");

    console.log(
      `Planning API smoke passed (${serverMode}): goal -> 2 projects -> 3 milestones -> tasks; trees, isolation, ordering, moves, deletion, terminal guards, and idempotent rewards verified`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    if (serverLogs.length) console.error(serverLogs.join("").slice(-8000));
    process.exitCode = 1;
  } finally {
    stopServer();
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await prisma.$disconnect();
  }
}

function stopServer() {
  if (!server) return;
  try {
    if (process.platform !== "win32" && server.pid) {
      process.kill(-server.pid, "SIGTERM");
    } else {
      server.kill("SIGTERM");
    }
  } catch {
    server.kill("SIGTERM");
  }
}

function requireLocalBaseUrl(raw) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("PLANNING_SMOKE_BASE_URL is not a valid URL");
  }
  if (parsed.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(parsed.hostname)) {
    throw new Error("PLANNING_SMOKE_BASE_URL must use HTTP on localhost or 127.0.0.1");
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
      `Refusing non-local DATABASE_URL host ${JSON.stringify(parsed.hostname)}; planning smoke only runs on a temporary local database`,
    );
  }
  if (!parsed.pathname || parsed.pathname === "/") {
    throw new Error("DATABASE_URL must name an explicit temporary local database");
  }
  return raw;
}

await main();
