import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { GoalUpdateSchema } from "@/lib/validators";
import { safeCheck } from "@/lib/achievements";
import { grantReward } from "@/lib/rewards";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const body = await req.json();
  const data = GoalUpdateSchema.parse(body);

  const existing = await prisma.goal.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const wasDone = existing.status === "done";
  const becomingDone = data.status === "done" && !wasDone;

  const updated = await prisma.goal.update({
    where: { id },
    data: {
      objective: data.objective,
      notes: data.notes,
      areaId: data.areaId,
      status: data.status,
      confidence: data.confidence,
      timeframe: data.timeframe,
    },
    include: { keyResults: true, area: true, projects: true },
  });

  let reward = null;
  if (becomingDone) {
    reward = await grantReward({
      userId,
      xp: 500,
      gold: 200,
      gems: 5,
      fate: 2,
      source: "bonus",
      sourceId: id,
      areaId: existing.areaId,
    });
    after(() => safeCheck(userId));
  }

  return NextResponse.json({ goal: updated, reward, unlocks: [] });
}

export async function DELETE(_req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  await prisma.goal.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
