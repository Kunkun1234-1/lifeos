import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { grantReward } from "@/lib/rewards";
import { safeCheck } from "@/lib/achievements";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;

  const task = await prisma.task.findFirst({ where: { id, userId } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (task.status === "DONE") {
    return NextResponse.json({ error: "Already complete" }, { status: 400 });
  }

  const [updated, reward] = await Promise.all([
    prisma.task.update({
      where: { id },
      data: { status: "DONE", completedAt: new Date() },
      include: { area: true },
    }),
    grantReward({
      userId,
      xp: task.xpReward,
      gold: task.goldReward,
      source: "task",
      sourceId: task.id,
      areaId: task.areaId,
    }),
  ]);

  const unlocks = await safeCheck(userId);
  return NextResponse.json({ task: updated, reward, unlocks });
}
