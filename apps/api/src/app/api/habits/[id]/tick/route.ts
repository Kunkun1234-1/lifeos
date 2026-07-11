import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { grantReward, deductReward } from "@/lib/rewards";
import { HabitTickSchema } from "@/lib/validators";
import { safeCheck } from "@/lib/achievements";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const body = await req.json();
  const { direction } = HabitTickSchema.parse(body);

  const habit = await prisma.habit.findFirst({ where: { id, userId } });
  if (!habit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (direction === "+" && habit.direction === "negative") {
    return NextResponse.json({ error: "Direction mismatch" }, { status: 400 });
  }
  if (direction === "-" && habit.direction === "positive") {
    return NextResponse.json({ error: "Direction mismatch" }, { status: 400 });
  }

  const xp = habit.xpPerTick;
  const gold = habit.goldPerTick;

  if (direction === "+") {
    const [updated, reward] = await Promise.all([
      prisma.habit.update({
        where: { id },
        data: { positiveCount: { increment: 1 } },
        include: { area: true },
      }),
      prisma.habitTick.create({
        data: { habitId: id, direction: "+", xpDelta: xp, goldDelta: gold },
      }),
      grantReward({
        userId,
        xp,
        gold,
        source: "habit",
        sourceId: id,
        areaId: habit.areaId,
      }),
    ]);
    after(() => safeCheck(userId));
    return NextResponse.json({ habit: updated, reward, unlocks: [] });
  }

  // Negative direction
  const [updated, reward] = await Promise.all([
    prisma.habit.update({
      where: { id },
      data: { negativeCount: { increment: 1 } },
      include: { area: true },
    }),
    prisma.habitTick.create({
      data: { habitId: id, direction: "-", xpDelta: -xp, goldDelta: -gold },
    }),
    deductReward({
      userId,
      xp,
      gold,
      source: "habit",
      sourceId: id,
      areaId: habit.areaId,
    }),
  ]);
  after(() => safeCheck(userId));
  return NextResponse.json({ habit: updated, reward, unlocks: [] });
}
