import {
  env
} from "./chunk-TTYSRA5W.js";

// src/app.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import { ZodError } from "zod";

// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";
var globalForPrisma = globalThis;
var prisma = globalForPrisma.lifeosApiPrisma ?? new PrismaClient({
  datasourceUrl: env.DATABASE_URL,
  log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
});
if (env.NODE_ENV !== "production") {
  globalForPrisma.lifeosApiPrisma = prisma;
}

// src/lib/auth.ts
import { jwtVerify } from "jose";
var secret = new TextEncoder().encode(env.API_JWT_SECRET);
async function authenticate(request, reply) {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    await reply.code(401).send({ error: "Unauthenticated" });
    return;
  }
  try {
    const { payload } = await jwtVerify(authorization.slice(7), secret, {
      issuer: "lifeos-web",
      audience: "lifeos-api"
    });
    if (!payload.sub) throw new Error("Token subject is missing");
    request.userId = payload.sub;
  } catch {
    await reply.code(401).send({ error: "Invalid or expired access token" });
  }
}

// src/routes/areas.ts
async function areaRoutes(app) {
  app.get("/v1/areas", { preHandler: authenticate }, async (request) => {
    return prisma.area.findMany({
      where: { userId: request.userId, archived: false },
      orderBy: { order: "asc" }
    });
  });
}

// src/routes/tasks.ts
import { z as z3 } from "zod";

// ../../packages/contracts/src/tasks.ts
import { z as z2 } from "zod";

// ../../packages/contracts/src/common.ts
import { z } from "zod";
var NullableDateTimeSchema = z.union([z.string().datetime(), z.date()]).nullable();
var AreaSummarySchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  icon: z.string(),
  color: z.string(),
  weight: z.number(),
  healthScore: z.number().int(),
  attributeKey: z.string(),
  attributeXp: z.number().int(),
  order: z.number().int(),
  archived: z.boolean(),
  createdAt: z.union([z.string().datetime(), z.date()]),
  updatedAt: z.union([z.string().datetime(), z.date()])
});
var ProjectSummarySchema = z.object({
  id: z.string(),
  userId: z.string(),
  areaId: z.string().nullable(),
  goalId: z.string().nullable(),
  title: z.string(),
  deliverable: z.string().nullable(),
  notes: z.string().nullable(),
  status: z.string(),
  startDate: NullableDateTimeSchema,
  deadline: NullableDateTimeSchema,
  completedAt: NullableDateTimeSchema,
  xpReward: z.number().int(),
  goldReward: z.number().int(),
  gemsReward: z.number().int(),
  createdAt: z.union([z.string().datetime(), z.date()]),
  updatedAt: z.union([z.string().datetime(), z.date()])
});

// ../../packages/contracts/src/tasks.ts
var TaskStatusSchema = z2.enum([
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "CANCELED"
]);
var TaskCreateSchema = z2.object({
  title: z2.string().min(1).max(200),
  notes: z2.string().max(2e3).optional().nullable(),
  areaId: z2.string().optional().nullable(),
  projectId: z2.string().optional().nullable(),
  priority: z2.number().int().min(1).max(3).optional(),
  dueDate: z2.string().datetime().optional().nullable(),
  xpReward: z2.number().int().min(0).max(1e3).optional(),
  goldReward: z2.number().int().min(0).max(1e3).optional()
});
var TaskUpdateSchema = TaskCreateSchema.partial().extend({
  status: TaskStatusSchema.optional()
});
var TaskResponseSchema = z2.object({
  id: z2.string(),
  userId: z2.string(),
  areaId: z2.string().nullable(),
  projectId: z2.string().nullable(),
  title: z2.string(),
  notes: z2.string().nullable(),
  status: TaskStatusSchema.or(z2.string()),
  priority: z2.number().int(),
  dueDate: NullableDateTimeSchema,
  xpReward: z2.number().int(),
  goldReward: z2.number().int(),
  completedAt: NullableDateTimeSchema,
  createdAt: z2.union([z2.string().datetime(), z2.date()]),
  updatedAt: z2.union([z2.string().datetime(), z2.date()]),
  area: AreaSummarySchema.nullable(),
  project: ProjectSummarySchema.nullable()
});
var TasksResponseSchema = z2.array(TaskResponseSchema);

// ../../packages/domain/src/achievements.ts
import { Prisma } from "@prisma/client";

// ../../packages/domain/src/rewards.ts
async function grantReward(db, input) {
  return db.$transaction((tx) => grantRewardInTransaction(tx, input));
}
async function grantRewardInTransaction(tx, input) {
  const { userId, source, sourceId = null, areaId = null } = input;
  const xp = Math.max(0, Math.floor(input.xp));
  const gold = Math.max(0, Math.floor(input.gold ?? 0));
  const gems = Math.max(0, Math.floor(input.gems ?? 0));
  const fate = Math.max(0, Math.floor(input.fate ?? 0));
  const area = areaId ? await tx.area.findFirst({
    where: { id: areaId, userId },
    select: { id: true, attributeKey: true }
  }) : null;
  const areaKey = resolveAreaKey(area?.attributeKey);
  if (xp > 0) {
    await tx.xpLedger.create({
      data: { userId, amount: xp, source, sourceId, areaKey }
    });
    if (area) {
      await tx.area.update({
        where: { id: area.id },
        data: { attributeXp: { increment: xp } }
      });
    }
  }
  const currency = await tx.currency.upsert({
    where: { userId },
    create: { userId, gold, gems, fate },
    update: {
      gold: { increment: gold },
      gems: { increment: gems },
      fate: { increment: fate }
    }
  });
  return {
    xpGranted: xp,
    goldGranted: gold,
    gemsGranted: gems,
    fateGranted: fate,
    areaKey,
    currency
  };
}
var ATTRIBUTE_KEYS = /* @__PURE__ */ new Set(["STR", "INT", "CHA", "WIS", "CRE", "GOLD"]);
function resolveAreaKey(raw) {
  return raw && ATTRIBUTE_KEYS.has(raw) ? raw : null;
}

// ../../packages/domain/src/achievements.ts
async function checkAchievements(db, userId) {
  const [definitions, existing] = await Promise.all([
    db.achievement.findMany({
      where: { OR: [{ ownerUserId: null }, { ownerUserId: userId }] }
    }),
    db.achievementUnlock.findMany({
      where: { userId },
      select: { achievementId: true }
    })
  ]);
  const unlocked = new Set(existing.map((item) => item.achievementId));
  const [taskDoneCount, totalXp] = await Promise.all([
    db.task.count({ where: { userId, status: "DONE" } }),
    db.xpLedger.aggregate({ where: { userId }, _sum: { amount: true } }).then((row) => Math.max(0, row._sum.amount ?? 0))
  ]);
  const metrics = {
    task_done_count: taskDoneCount,
    total_xp: totalXp,
    level: deriveLevel(totalXp)
  };
  const results = [];
  for (const definition of definitions) {
    if (unlocked.has(definition.id)) continue;
    const [metric, thresholdRaw] = definition.trigger.split(":");
    const threshold = Number(thresholdRaw);
    if (!metric || Number.isNaN(threshold) || metrics[metric] === void 0) continue;
    if (metrics[metric] < threshold) continue;
    try {
      await db.achievementUnlock.create({
        data: { userId, achievementId: definition.id }
      });
      if (definition.rewardGold + definition.rewardGems + definition.rewardFate > 0) {
        await grantReward(db, {
          userId,
          xp: 0,
          gold: definition.rewardGold,
          gems: definition.rewardGems,
          fate: definition.rewardFate,
          source: "bonus",
          sourceId: definition.id
        });
      }
      await unlockAchievementCollections(db, userId, definition.key);
      results.push({
        id: definition.id,
        key: definition.key,
        name: definition.name,
        emoji: definition.emoji,
        tier: definition.tier,
        rewardGold: definition.rewardGold,
        rewardGems: definition.rewardGems,
        rewardFate: definition.rewardFate
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  return results;
}
async function safeCheckAchievements(db, userId) {
  try {
    return await checkAchievements(db, userId);
  } catch (error) {
    console.error("[achievements] check failed", error);
    return [];
  }
}
async function unlockAchievementCollections(db, userId, achievementKey) {
  const [titles, equipment] = await Promise.all([
    db.title.findMany({
      where: { sourceAchievementKey: achievementKey },
      select: { key: true }
    }),
    db.equipment.findMany({
      where: { source: "achievement", sourceKey: achievementKey },
      select: { key: true }
    })
  ]);
  await Promise.all([
    ...titles.map(
      (title) => db.userTitle.upsert({
        where: { userId_titleKey: { userId, titleKey: title.key } },
        create: { userId, titleKey: title.key },
        update: {}
      })
    ),
    ...equipment.map(
      (item) => db.userEquipment.upsert({
        where: { userId_equipmentKey: { userId, equipmentKey: item.key } },
        create: { userId, equipmentKey: item.key },
        update: {}
      })
    )
  ]);
}
function deriveLevel(totalXp) {
  let level = 1;
  let remaining = Math.max(0, totalXp);
  let needed = Math.floor(100 * Math.pow(level, 1.5));
  while (remaining >= needed) {
    remaining -= needed;
    level += 1;
    needed = Math.floor(100 * Math.pow(level, 1.5));
  }
  return level;
}
function isUniqueViolation(error) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

// ../../packages/domain/src/tasks.ts
var TASK_INCLUDE = { area: true, project: true };
var TaskNotFoundError = class extends Error {
};
var TaskAlreadyCompleteError = class extends Error {
};
var TaskLinkError = class extends Error {
};
async function listTasks(db, userId, filters) {
  return db.task.findMany({
    where: {
      userId,
      ...filters.status ? { status: filters.status } : {},
      ...filters.projectId ? { projectId: filters.projectId } : {}
    },
    include: TASK_INCLUDE,
    orderBy: [
      { status: "asc" },
      { dueDate: "asc" },
      { priority: "asc" },
      { createdAt: "desc" }
    ]
  });
}
async function createTask(db, userId, data) {
  await assertOwnedTaskLinks(db, userId, data);
  return db.task.create({
    data: {
      userId,
      title: data.title,
      notes: data.notes ?? null,
      areaId: data.areaId ?? null,
      projectId: data.projectId ?? null,
      priority: data.priority ?? 2,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      xpReward: data.xpReward ?? 10,
      goldReward: data.goldReward ?? 5
    },
    include: TASK_INCLUDE
  });
}
async function updateTask(db, userId, taskId, data) {
  const existing = await db.task.findFirst({ where: { id: taskId, userId } });
  if (!existing) throw new TaskNotFoundError("Task not found");
  await assertOwnedTaskLinks(db, userId, data);
  return db.task.update({
    where: { id: taskId },
    data: {
      title: data.title,
      notes: data.notes,
      areaId: data.areaId,
      projectId: data.projectId,
      priority: data.priority,
      dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? null : void 0,
      status: data.status,
      completedAt: data.status === "DONE" ? existing.completedAt ?? /* @__PURE__ */ new Date() : data.status ? null : void 0,
      xpReward: data.xpReward,
      goldReward: data.goldReward
    },
    include: TASK_INCLUDE
  });
}
async function deleteTask(db, userId, taskId) {
  const deleted = await db.task.deleteMany({ where: { id: taskId, userId } });
  if (deleted.count === 0) throw new TaskNotFoundError("Task not found");
}
async function completeTask(db, userId, taskId) {
  return db.$transaction(async (tx) => {
    const task = await tx.task.findFirst({ where: { id: taskId, userId } });
    if (!task) throw new TaskNotFoundError("Task not found");
    const transitioned = await tx.task.updateMany({
      where: { id: taskId, userId, status: { not: "DONE" } },
      data: { status: "DONE", completedAt: /* @__PURE__ */ new Date() }
    });
    if (transitioned.count === 0) {
      throw new TaskAlreadyCompleteError("Task is already complete");
    }
    const reward = await grantRewardInTransaction(tx, {
      userId,
      xp: task.xpReward,
      gold: task.goldReward,
      source: "task",
      sourceId: task.id,
      areaId: task.areaId
    });
    const updated = await tx.task.findUniqueOrThrow({
      where: { id: taskId },
      include: TASK_INCLUDE
    });
    return { task: updated, reward };
  });
}
async function assertOwnedTaskLinks(db, userId, data) {
  const [area, project] = await Promise.all([
    data.areaId ? db.area.findFirst({
      where: { id: data.areaId, userId, archived: false },
      select: { id: true }
    }) : Promise.resolve({ id: "none" }),
    data.projectId ? db.project.findFirst({
      where: { id: data.projectId, userId, status: { not: "archived" } },
      select: { id: true }
    }) : Promise.resolve({ id: "none" })
  ]);
  if (data.areaId && !area) throw new TaskLinkError("Area not found or not yours");
  if (data.projectId && !project) {
    throw new TaskLinkError("Project not found or not yours");
  }
}

// src/routes/tasks.ts
var TaskQuerySchema = z3.object({
  status: z3.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELED"]).optional(),
  projectId: z3.string().optional()
});
var TaskParamsSchema = z3.object({ id: z3.string().min(1) });
async function taskRoutes(app) {
  app.get("/v1/tasks", { preHandler: authenticate }, async (request) => {
    const query = TaskQuerySchema.parse(request.query);
    return listTasks(prisma, request.userId, query);
  });
  app.post("/v1/tasks", { preHandler: authenticate }, async (request, reply) => {
    const body = TaskCreateSchema.parse(request.body);
    try {
      const task = await createTask(prisma, request.userId, body);
      return reply.code(201).send(task);
    } catch (error) {
      if (error instanceof TaskLinkError) {
        return reply.code(400).send({ error: error.message });
      }
      throw error;
    }
  });
  app.patch(
    "/v1/tasks/:id",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = TaskParamsSchema.parse(request.params);
      const body = TaskUpdateSchema.parse(request.body);
      try {
        return await updateTask(prisma, request.userId, id, body);
      } catch (error) {
        return handleTaskError(error, reply);
      }
    }
  );
  app.delete(
    "/v1/tasks/:id",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = TaskParamsSchema.parse(request.params);
      try {
        await deleteTask(prisma, request.userId, id);
        return { ok: true };
      } catch (error) {
        return handleTaskError(error, reply);
      }
    }
  );
  app.post(
    "/v1/tasks/:id/complete",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = TaskParamsSchema.parse(request.params);
      try {
        const result = await completeTask(prisma, request.userId, id);
        void safeCheckAchievements(prisma, request.userId);
        return { ...result, unlocks: [] };
      } catch (error) {
        return handleTaskError(error, reply);
      }
    }
  );
}
function handleTaskError(error, reply) {
  if (error instanceof TaskNotFoundError) {
    return reply.code(404).send({ error: error.message });
  }
  if (error instanceof TaskAlreadyCompleteError) {
    return reply.code(409).send({ error: error.message });
  }
  if (error instanceof TaskLinkError) {
    return reply.code(400).send({ error: error.message });
  }
  throw error;
}

// src/app.ts
async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "development" ? "info" : "warn"
    }
  });
  const allowedOrigins = env.WEB_ORIGIN.split(",").map((origin) => origin.trim());
  await app.register(cors, {
    origin: allowedOrigins,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  });
  app.get("/health", async () => ({ status: "ok", service: "lifeos-api" }));
  app.get("/ready", async (_request, reply) => {
    try {
      await prisma.$queryRaw`select 1`;
      return { status: "ready" };
    } catch {
      return reply.code(503).send({ error: "Database unavailable" });
    }
  });
  await app.register(areaRoutes);
  await app.register(taskRoutes);
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: error.issues[0]?.message ?? "Invalid request",
        details: error.flatten()
      });
    }
    app.log.error(error);
    return reply.code(500).send({ error: "Internal server error" });
  });
  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
  return app;
}
export {
  buildApp
};
//# sourceMappingURL=app-7YLTIDQE.js.map