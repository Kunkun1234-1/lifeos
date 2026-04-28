import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { grantReward } from "@/lib/rewards";
import { todayYMD, addDaysYMD } from "@/lib/date";
import { safeCheck } from "@/lib/achievements";

type Params = { params: Promise<{ id: string }> };

/**
 * Complete a routine for today. Idempotent per (routineId, date) via unique constraint.
 * Streak logic per design §4.8:
 *   - consecutive day → streak_current + 1
 *   - gap of 1+ days → streak resets to 1 (no HP penalty, just recount)
 */
export async function POST(_req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const today = todayYMD();
  const yesterday = addDaysYMD(today, -1);

  const routine = await prisma.routine.findFirst({ where: { id, userId } });
  if (!routine) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Idempotent: if already completed today, return early.
  const existing = await prisma.routineCompletion.findUnique({
    where: { routineId_date: { routineId: id, date: today } },
  });
  if (existing) {
    return NextResponse.json({ routine, already: true });
  }

  const newStreak = routine.lastCompletedDate === yesterday
    ? routine.streakCurrent + 1
    : 1;
  const bestStreak = Math.max(routine.streakBest, newStreak);

  const [updated, _completion, reward] = await Promise.all([
    prisma.routine.update({
      where: { id },
      data: {
        streakCurrent: newStreak,
        streakBest: bestStreak,
        lastCompletedDate: today,
      },
      include: { area: true },
    }),
    prisma.routineCompletion.create({
      data: { routineId: id, date: today },
    }),
    grantReward({
      userId,
      xp: routine.xpReward,
      gold: routine.goldReward,
      source: "routine",
      sourceId: id,
      areaId: routine.areaId,
    }),
  ]);

  const unlocks = await safeCheck(userId);
  return NextResponse.json({ routine: updated, reward, streak: newStreak, unlocks });
}
