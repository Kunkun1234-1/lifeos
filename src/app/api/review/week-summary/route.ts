import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { startOfWeekYMD, endOfWeekYMD, ymdToDate } from "@/lib/date";

/**
 * Returns an aggregate summary of the current week, intended to seed
 * the Weekly Review form (so the user reviews against real numbers).
 */
export async function GET() {
  const userId = await getCurrentUserId();
  const weekStart = startOfWeekYMD();
  const weekEnd = endOfWeekYMD();
  const periodStart = ymdToDate(weekStart, false);
  const periodEnd = ymdToDate(weekEnd, true);

  const [
    tasksDone,
    habitsTicked,
    routinesDone,
    commissionsFull,
    dailyReviews,
    xpEntries,
    activeGoals,
    activeProjects,
    recentMoods,
  ] = await Promise.all([
    prisma.task.count({
      where: { userId, status: "DONE", completedAt: { gte: periodStart, lte: periodEnd } },
    }),
    prisma.habitTick.count({
      where: { habit: { userId }, direction: "+", createdAt: { gte: periodStart, lte: periodEnd } },
    }),
    prisma.routineCompletion.count({
      where: { routine: { userId }, date: { gte: weekStart, lte: weekEnd } },
    }),
    prisma.dailyCommission.count({
      where: { userId, bonusClaimed: true, date: { gte: weekStart, lte: weekEnd } },
    }),
    prisma.review.count({
      where: { userId, kind: "daily", createdAt: { gte: periodStart, lte: periodEnd } },
    }),
    prisma.xpLedger.findMany({
      where: { userId, createdAt: { gte: periodStart, lte: periodEnd }, amount: { gt: 0 } },
      select: { amount: true, areaKey: true },
    }),
    prisma.goal.findMany({
      where: { userId, status: "active" },
      include: { keyResults: true, area: true },
      take: 8,
    }),
    prisma.project.findMany({
      where: { userId, status: "active" },
      include: { area: true, tasks: { select: { status: true } } },
      take: 8,
    }),
    prisma.review.findMany({
      where: { userId, kind: "daily", createdAt: { gte: periodStart, lte: periodEnd } },
      select: { mood: true, energy: true, focus: true },
    }),
  ]);

  let weeklyXp = 0;
  const xpByArea: Record<string, number> = {};
  for (const e of xpEntries) {
    weeklyXp += e.amount;
    if (e.areaKey) xpByArea[e.areaKey] = (xpByArea[e.areaKey] ?? 0) + e.amount;
  }

  const avg = (arr: number[]) =>
    arr.length === 0 ? null : Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10;

  const moodAvg = avg(recentMoods.map((r) => r.mood ?? 0).filter((v) => v > 0));
  const energyAvg = avg(recentMoods.map((r) => r.energy ?? 0).filter((v) => v > 0));
  const focusAvg = avg(recentMoods.map((r) => r.focus ?? 0).filter((v) => v > 0));

  return NextResponse.json({
    weekStart,
    weekEnd,
    counts: {
      tasksDone,
      habitsTicked,
      routinesDone,
      commissionsFull,
      dailyReviews,
    },
    weeklyXp,
    xpByArea,
    averages: { mood: moodAvg, energy: energyAvg, focus: focusAvg },
    activeGoals: activeGoals.map((g) => ({
      id: g.id,
      objective: g.objective,
      timeframe: g.timeframe,
      area: g.area?.name ?? null,
      confidence: g.confidence,
      krs: g.keyResults.map((k) => ({
        description: k.description,
        current: k.current,
        target: k.target,
        unit: k.unit,
      })),
    })),
    activeProjects: activeProjects.map((p) => ({
      id: p.id,
      title: p.title,
      area: p.area?.name ?? null,
      taskCount: p.tasks.length,
      taskDone: p.tasks.filter((t) => t.status === "DONE").length,
    })),
  });
}
