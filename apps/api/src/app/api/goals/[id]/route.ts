import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { GoalUpdateSchema } from "@/lib/validators";
import { safeCheck } from "@/lib/achievements";
import { grantRewardInTransaction } from "@lifeos/domain/rewards";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const body = await req.json();
  const data = GoalUpdateSchema.parse(body);

  const existing = await prisma.goal.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.status === "done" && data.status && data.status !== "done") {
    return NextResponse.json(
      { error: "Completed goals cannot be reopened" },
      { status: 409 },
    );
  }

  const wasDone = existing.status === "done";
  const becomingDone = data.status === "done" && !wasDone;
  const updateData = {
    objective: data.objective,
    notes: data.notes,
    type: data.type,
    areaId: data.areaId,
    status: data.status,
    confidence: data.confidence,
    timeframe: data.timeframe,
  };

  if (becomingDone) {
    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.goal.updateMany({
        where: { id, userId, status: { not: "done" } },
        data: updateData,
      });
      if (claimed.count === 0) return null;

      const reward = await grantRewardInTransaction(tx, {
        userId,
        xp: 500,
        gold: 200,
        gems: 5,
        fate: 2,
        source: "bonus",
        sourceId: id,
        areaId: existing.areaId,
      });
      const goal = await tx.goal.findUniqueOrThrow({
        where: { id },
        include: { keyResults: true, area: true, projects: true },
      });
      return { goal, reward };
    });

    if (!result) {
      return NextResponse.json(
        { error: "Goal completion was already claimed" },
        { status: 409 },
      );
    }
    after(() => safeCheck(userId));
    return NextResponse.json({ ...result, unlocks: [] });
  }

  if (data.status && data.status !== "done") {
    const goal = await prisma.$transaction(async (tx) => {
      const updated = await tx.goal.updateMany({
        where: { id, userId, status: { not: "done" } },
        data: updateData,
      });
      if (updated.count === 0) return null;
      return tx.goal.findUniqueOrThrow({
        where: { id },
        include: { keyResults: true, area: true, projects: true },
      });
    });
    if (!goal) {
      return NextResponse.json(
        { error: "Completed goals cannot be reopened" },
        { status: 409 },
      );
    }
    return NextResponse.json({ goal, reward: null, unlocks: [] });
  }

  const goal = await prisma.goal.update({
    where: { id },
    data: updateData,
    include: { keyResults: true, area: true, projects: true },
  });
  return NextResponse.json({ goal, reward: null, unlocks: [] });
}

export async function DELETE(_req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  await prisma.goal.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
