import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { ProjectUpdateSchema } from "@/lib/validators";
import { grantReward } from "@/lib/rewards";
import { safeCheck } from "@/lib/achievements";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const body = await req.json();
  const data = ProjectUpdateSchema.parse(body);

  const existing = await prisma.project.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const becomingDone = data.status === "done" && existing.status !== "done";

  const updated = await prisma.project.update({
    where: { id },
    data: {
      title: data.title,
      deliverable: data.deliverable,
      notes: data.notes,
      areaId: data.areaId,
      goalId: data.goalId,
      status: data.status,
      startDate: data.startDate ? new Date(data.startDate) : data.startDate === null ? null : undefined,
      deadline: data.deadline ? new Date(data.deadline) : data.deadline === null ? null : undefined,
      xpReward: data.xpReward,
      goldReward: data.goldReward,
      gemsReward: data.gemsReward,
      completedAt: becomingDone ? new Date() : undefined,
    },
    include: { area: true, goal: true, tasks: true },
  });

  let reward = null;
  let unlocks = null;
  if (becomingDone) {
    reward = await grantReward({
      userId,
      xp: existing.xpReward,
      gold: existing.goldReward,
      gems: existing.gemsReward,
      source: "bonus",
      sourceId: id,
      areaId: existing.areaId,
    });
    unlocks = await safeCheck(userId);
  }

  return NextResponse.json({ project: updated, reward, unlocks });
}

export async function DELETE(_req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  await prisma.project.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
