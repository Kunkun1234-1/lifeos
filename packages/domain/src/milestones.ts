import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  MilestoneCreateInput,
  MilestoneUpdateInput,
} from "@lifeos/contracts";

export class MilestoneNotFoundError extends Error {}
export class MilestoneLinkError extends Error {}

export const MILESTONE_SELECT = {
  id: true,
  projectId: true,
  title: true,
  notes: true,
  acceptanceCriteria: true,
  status: true,
  order: true,
  startDate: true,
  deadline: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.MilestoneSelect;

export async function listMilestones(
  db: PrismaClient,
  userId: string,
  projectId: string,
) {
  await assertOwnedProject(db, userId, projectId);
  return db.milestone.findMany({
    where: { userId, projectId },
    select: MILESTONE_SELECT,
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
}

export async function getMilestone(
  db: PrismaClient,
  userId: string,
  milestoneId: string,
) {
  const milestone = await db.milestone.findFirst({
    where: { id: milestoneId, userId },
    select: MILESTONE_SELECT,
  });
  if (!milestone) throw new MilestoneNotFoundError("Milestone not found");
  return milestone;
}

export async function createMilestone(
  db: PrismaClient,
  userId: string,
  data: MilestoneCreateInput,
) {
  await assertOwnedProject(db, userId, data.projectId);
  assertDateOrder(data.startDate, data.deadline);

  const order = data.order ?? await nextMilestoneOrder(db, userId, data.projectId);
  return db.milestone.create({
    data: {
      userId,
      projectId: data.projectId,
      title: data.title,
      notes: data.notes ?? null,
      acceptanceCriteria: data.acceptanceCriteria ?? null,
      status: data.status ?? "TODO",
      order,
      startDate: toNullableDate(data.startDate),
      deadline: toNullableDate(data.deadline),
      completedAt: data.status === "DONE" ? new Date() : null,
    },
    select: MILESTONE_SELECT,
  });
}

export async function updateMilestone(
  db: PrismaClient,
  userId: string,
  milestoneId: string,
  data: MilestoneUpdateInput,
) {
  const existing = await db.milestone.findFirst({
    where: { id: milestoneId, userId },
  });
  if (!existing) throw new MilestoneNotFoundError("Milestone not found");

  const projectId = data.projectId ?? existing.projectId;
  if (data.projectId && data.projectId !== existing.projectId) {
    await assertOwnedProject(db, userId, data.projectId);
  }

  const startDate = Object.prototype.hasOwnProperty.call(data, "startDate")
    ? toNullableDate(data.startDate)
    : existing.startDate;
  const deadline = Object.prototype.hasOwnProperty.call(data, "deadline")
    ? toNullableDate(data.deadline)
    : existing.deadline;
  assertDateOrder(startDate, deadline);

  const becomingDone = data.status === "DONE" && existing.status !== "DONE";
  const leavingDone = data.status && data.status !== "DONE";

  return db.$transaction(async (tx) => {
    let order = data.order;
    if (projectId !== existing.projectId) {
      if (order === undefined) {
        const aggregate = await tx.milestone.aggregate({
          where: { userId, projectId },
          _max: { order: true },
        });
        order = (aggregate._max.order ?? -1) + 1;
      }
      await tx.task.updateMany({
        where: { userId, milestoneId },
        data: { projectId },
      });
    }

    return tx.milestone.update({
      where: { id: milestoneId },
      data: {
        projectId: data.projectId,
        title: data.title,
        notes: data.notes,
        acceptanceCriteria: data.acceptanceCriteria,
        status: data.status,
        order,
        startDate: Object.prototype.hasOwnProperty.call(data, "startDate")
          ? startDate
          : undefined,
        deadline: Object.prototype.hasOwnProperty.call(data, "deadline")
          ? deadline
          : undefined,
        completedAt: becomingDone
          ? new Date()
          : leavingDone
            ? null
            : undefined,
      },
      select: MILESTONE_SELECT,
    });
  });
}

export async function deleteMilestone(
  db: PrismaClient,
  userId: string,
  milestoneId: string,
) {
  const deleted = await db.milestone.deleteMany({
    where: { id: milestoneId, userId },
  });
  if (deleted.count === 0) {
    throw new MilestoneNotFoundError("Milestone not found");
  }
}

async function assertOwnedProject(
  db: PrismaClient,
  userId: string,
  projectId: string,
) {
  const project = await db.project.findFirst({
    where: { id: projectId, userId, status: { not: "archived" } },
    select: { id: true },
  });
  if (!project) {
    throw new MilestoneLinkError("Project not found or not yours");
  }
}

async function nextMilestoneOrder(
  db: PrismaClient,
  userId: string,
  projectId: string,
) {
  const aggregate = await db.milestone.aggregate({
    where: { userId, projectId },
    _max: { order: true },
  });
  return (aggregate._max.order ?? -1) + 1;
}

function toNullableDate(value: string | Date | null | undefined) {
  if (value === null || value === undefined) return value ?? null;
  return value instanceof Date ? value : new Date(value);
}

function assertDateOrder(
  startDate: string | Date | null | undefined,
  deadline: string | Date | null | undefined,
) {
  if (!startDate || !deadline) return;
  if (new Date(deadline) < new Date(startDate)) {
    throw new MilestoneLinkError(
      "Milestone deadline cannot be before its start date",
    );
  }
}
