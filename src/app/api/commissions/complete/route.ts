import { NextResponse, after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import {
  getOrGenerateTodayCommissions,
  hydrateCommissionItems,
  parseItems,
  type CommissionItem,
} from "@/lib/commissions";
import { grantReward } from "@/lib/rewards";
import { todayYMD, addDaysYMD } from "@/lib/date";
import { safeCheck } from "@/lib/achievements";

const BodySchema = z.object({ itemId: z.string() });

/**
 * Complete one commission item. Side-effects:
 *   - mark the item done in the day's JSON
 *   - increment completedCount
 *   - also complete the underlying task/routine/habit (cascade)
 *   - grant rewards (XP + gold, + bonus when 4/4)
 */
export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  const body = await req.json();
  const { itemId } = BodySchema.parse(body);

  const row = await getOrGenerateTodayCommissions(userId);
  const items: CommissionItem[] = await hydrateCommissionItems(parseItems(row.items), userId);
  const idx = items.findIndex((it) => it.id === itemId);
  if (idx === -1) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  if (items[idx].done) return NextResponse.json({ error: "Already done" }, { status: 400 });

  const item = items[idx];
  items[idx] = { ...item, done: true };
  const completedCount = items.filter((it) => it.done).length;
  const allDone = completedCount === items.length && items.length > 0;
  const shouldBonus = allDone && !row.bonusClaimed;

  // Cascade: update underlying entity
  const today = todayYMD();
  if (item.sourceType === "task") {
    await prisma.task.updateMany({
      where: { id: item.sourceId, userId, status: "TODO" },
      data: { status: "DONE", completedAt: new Date() },
    });
  } else if (item.sourceType === "habit") {
    await prisma.$transaction([
      prisma.habit.update({
        where: { id: item.sourceId },
        data: { positiveCount: { increment: 1 } },
      }),
      prisma.habitTick.create({
        data: { habitId: item.sourceId, direction: "+", xpDelta: item.xp, goldDelta: item.gold },
      }),
    ]);
  } else if (item.sourceType === "routine") {
    const yesterday = addDaysYMD(today, -1);
    const routine = await prisma.routine.findUnique({ where: { id: item.sourceId } });
    if (routine) {
      const existingCompletion = await prisma.routineCompletion.findUnique({
        where: { routineId_date: { routineId: item.sourceId, date: today } },
      });
      if (!existingCompletion) {
        const newStreak = routine.lastCompletedDate === yesterday
          ? routine.streakCurrent + 1
          : 1;
        await prisma.$transaction([
          prisma.routine.update({
            where: { id: item.sourceId },
            data: {
              streakCurrent: newStreak,
              streakBest: Math.max(routine.streakBest, newStreak),
              lastCompletedDate: today,
            },
          }),
          prisma.routineCompletion.create({
            data: { routineId: item.sourceId, date: today },
          }),
        ]);
      }
    }
  }

  // Grant base reward for this item
  const reward = await grantReward({
    userId,
    xp: item.xp,
    gold: item.gold,
    source: "commission",
    sourceId: item.sourceId,
    areaId: item.areaId,
  });

  // All-done bonus (per design §4.3 — "Katheryne" bonus)
  let bonusReward = null;
  if (shouldBonus) {
    bonusReward = await grantReward({
      userId,
      xp: 50,
      gold: 20,
      gems: 2,
      source: "bonus",
      sourceId: row.id,
      areaId: null,
    });
  }

  const updated = await prisma.dailyCommission.update({
    where: { id: row.id },
    data: {
      items: JSON.stringify(items),
      completedCount,
      bonusClaimed: shouldBonus ? true : row.bonusClaimed,
    },
  });

  after(() => safeCheck(userId));
  return NextResponse.json({
    id: updated.id,
    items,
    completedCount,
    bonusClaimed: updated.bonusClaimed,
    reward,
    bonusReward,
    allDone,
    unlocks: [],
  });
}
