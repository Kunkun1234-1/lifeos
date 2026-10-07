import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { ProjectUpdateSchema } from "@/lib/validators";
import { grantRewardInTransaction } from "@lifeos/domain/rewards";
import { safeCheck } from "@/lib/achievements";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const body = await req.json();
  const data = ProjectUpdateSchema.parse(body);

  const existing = await prisma.project.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.status === "done" && data.status && data.status !== "done") {
    return NextResponse.json(
      { error: "Completed projects cannot be reopened" },
      { status: 409 },
    );
  }

  const [area, goal] = await Promise.all([
    data.areaId
      ? prisma.area.findFirst({
          where: { id: data.areaId, userId, archived: false },
          select: { id: true },
        })
      : Promise.resolve({ id: "none" }),
    data.goalId
      ? prisma.goal.findFirst({
          where: { id: data.goalId, userId, status: { not: "archived" } },
          select: { id: true },
        })
      : Promise.resolve({ id: "none" }),
  ]);
  if (data.areaId && !area) {
    return NextResponse.json(
      { error: "Area not found or not yours" },
      { status: 400 },
    );
  }
  if (data.goalId && !goal) {
    return NextResponse.json(
      { error: "Goal not found or not yours" },
      { status: 400 },
    );
  }

  const becomingDone = data.status === "done" && existing.status !== "done";
  const updateData = {
    title: data.title,
    deliverable: data.deliverable,
    notes: data.notes,
    areaId: data.areaId,
    goalId: data.goalId,
    status: data.status,
    startDate: data.startDate
      ? new Date(data.startDate)
      : data.startDate === null
        ? null
        : undefined,
    deadline: data.deadline
      ? new Date(data.deadline)
      : data.deadline === null
        ? null
        : undefined,
    xpReward: data.xpReward,
    goldReward: data.goldReward,
    gemsReward: data.gemsReward,
    completedAt: becomingDone ? new Date() : undefined,
  };

  if (becomingDone) {
    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.project.updateMany({
        where: { id, userId, status: { not: "done" } },
        data: updateData,
      });
      if (claimed.count === 0) return null;

      const reward = await grantRewardInTransaction(tx, {
        userId,
        xp: existing.xpReward,
        gold: existing.goldReward,
        gems: existing.gemsReward,
        source: "bonus",
        sourceId: id,
        areaId: existing.areaId,
      });
      const project = await tx.project.findUniqueOrThrow({
        where: { id },
        include: { area: true, goal: true, tasks: true },
      });
      return { project, reward };
    });

    if (!result) {
      return NextResponse.json(
        { error: "Project completion was already claimed" },
        { status: 409 },
      );
    }
    after(() => safeCheck(userId));
    return NextResponse.json({ ...result, unlocks: [] });
  }

  if (data.status && data.status !== "done") {
    const project = await prisma.$transaction(async (tx) => {
      const updated = await tx.project.updateMany({
        where: { id, userId, status: { not: "done" } },
        data: updateData,
      });
      if (updated.count === 0) return null;
      return tx.project.findUniqueOrThrow({
        where: { id },
        include: { area: true, goal: true, tasks: true },
      });
    });
    if (!project) {
      return NextResponse.json(
        { error: "Completed projects cannot be reopened" },
        { status: 409 },
      );
    }
    return NextResponse.json({ project, reward: null, unlocks: [] });
  }

  const project = await prisma.project.update({
    where: { id },
    data: updateData,
    include: { area: true, goal: true, tasks: true },
  });
  return NextResponse.json({ project, reward: null, unlocks: [] });
}

export async function DELETE(_req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  await prisma.project.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
