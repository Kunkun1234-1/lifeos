import type { PrismaClient } from "@prisma/client";
import type {
  TaskCreateInput,
  TaskUpdateInput,
} from "@lifeos/contracts/tasks";
import { grantRewardInTransaction } from "./rewards";

const TASK_INCLUDE = { area: true, project: true } as const;

export class TaskNotFoundError extends Error {}
export class TaskAlreadyCompleteError extends Error {}
export class TaskLinkError extends Error {}

export async function listTasks(
  db: PrismaClient,
  userId: string,
  filters: { status?: string; projectId?: string; limit?: number },
) {
  return db.task.findMany({
    where: {
      userId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
    },
    include: TASK_INCLUDE,
    orderBy: [
      { status: "asc" },
      { dueDate: "asc" },
      { priority: "asc" },
      { createdAt: "desc" },
    ],
    ...(filters.limit ? { take: filters.limit } : {}),
  });
}

export async function createTask(
  db: PrismaClient,
  userId: string,
  data: TaskCreateInput,
) {
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
      goldReward: data.goldReward ?? 5,
    },
    include: TASK_INCLUDE,
  });
}

export async function updateTask(
  db: PrismaClient,
  userId: string,
  taskId: string,
  data: TaskUpdateInput,
) {
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
      dueDate: data.dueDate
        ? new Date(data.dueDate)
        : data.dueDate === null
          ? null
          : undefined,
      status: data.status,
      completedAt:
        data.status === "DONE"
          ? existing.completedAt ?? new Date()
          : data.status
            ? null
            : undefined,
      xpReward: data.xpReward,
      goldReward: data.goldReward,
    },
    include: TASK_INCLUDE,
  });
}

export async function deleteTask(
  db: PrismaClient,
  userId: string,
  taskId: string,
) {
  const deleted = await db.task.deleteMany({ where: { id: taskId, userId } });
  if (deleted.count === 0) throw new TaskNotFoundError("Task not found");
}

export async function completeTask(
  db: PrismaClient,
  userId: string,
  taskId: string,
) {
  return db.$transaction(async (tx) => {
    const task = await tx.task.findFirst({ where: { id: taskId, userId } });
    if (!task) throw new TaskNotFoundError("Task not found");

    const transitioned = await tx.task.updateMany({
      where: { id: taskId, userId, status: { not: "DONE" } },
      data: { status: "DONE", completedAt: new Date() },
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
      areaId: task.areaId,
    });
    const updated = await tx.task.findUniqueOrThrow({
      where: { id: taskId },
      include: TASK_INCLUDE,
    });

    return { task: updated, reward };
  });
}

async function assertOwnedTaskLinks(
  db: PrismaClient,
  userId: string,
  data: Pick<TaskCreateInput, "areaId" | "projectId">,
) {
  const [area, project] = await Promise.all([
    data.areaId
      ? db.area.findFirst({
          where: { id: data.areaId, userId, archived: false },
          select: { id: true },
        })
      : Promise.resolve({ id: "none" }),
    data.projectId
      ? db.project.findFirst({
          where: { id: data.projectId, userId, status: { not: "archived" } },
          select: { id: true },
        })
      : Promise.resolve({ id: "none" }),
  ]);

  if (data.areaId && !area) throw new TaskLinkError("Area not found or not yours");
  if (data.projectId && !project) {
    throw new TaskLinkError("Project not found or not yours");
  }
}
