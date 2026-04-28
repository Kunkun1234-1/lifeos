import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { format, startOfDay, subDays } from "date-fns";

/**
 * GET /api/analytics — snapshot for the analytics dashboard.
 *
 * Returns:
 * - heatmap: per-day XP for last 90 days
 * - areaXp: cumulative XP by attribute key (last 90 days)
 * - moodTrend: per-day mood/energy/focus averages (last 30 daily reviews)
 * - taskByArea: task done counts grouped by area, last 30 days
 * - decisionsRating: distribution of decision ratings (per Heath: process > outcome)
 */
export async function GET() {
  const userId = await getCurrentUserId();
  const now = new Date();
  const day0 = startOfDay(now);
  const since90 = subDays(day0, 89);
  const since30 = subDays(day0, 29);

  const [xpRows, dailyReviews, tasksDone, areas, decisions] = await Promise.all([
    prisma.xpLedger.findMany({
      where: { userId, createdAt: { gte: since90 } },
      select: { amount: true, areaKey: true, createdAt: true },
    }),
    prisma.review.findMany({
      where: { userId, kind: "daily", createdAt: { gte: since30 } },
      orderBy: { createdAt: "asc" },
      select: { mood: true, energy: true, focus: true, createdAt: true },
    }),
    prisma.task.findMany({
      where: { userId, status: "DONE", completedAt: { gte: since30 } },
      select: { area: { select: { name: true, icon: true, attributeKey: true, color: true } } },
    }),
    prisma.area.findMany({
      where: { userId, archived: false },
      orderBy: { order: "asc" },
      select: { name: true, icon: true, color: true, attributeKey: true, attributeXp: true, healthScore: true },
    }),
    prisma.decision.findMany({
      where: { userId, status: "reviewed", rating: { not: null } },
      select: { rating: true, title: true, createdAt: true },
    }),
  ]);

  // Heatmap — 90 days, key=YYYY-MM-DD
  const heatmap: Record<string, number> = {};
  for (let i = 0; i < 90; i++) {
    const d = format(subDays(day0, 89 - i), "yyyy-MM-dd");
    heatmap[d] = 0;
  }
  for (const r of xpRows) {
    const k = format(startOfDay(r.createdAt), "yyyy-MM-dd");
    if (k in heatmap) heatmap[k] += r.amount;
  }

  // Area XP cumulative (last 90 days)
  const areaXp: Record<string, number> = {};
  for (const r of xpRows) {
    if (!r.areaKey) continue;
    areaXp[r.areaKey] = (areaXp[r.areaKey] ?? 0) + r.amount;
  }

  // Mood trend — group by date
  const moodByDate: Record<string, { mood: number[]; energy: number[]; focus: number[] }> = {};
  for (const r of dailyReviews) {
    const k = format(startOfDay(r.createdAt), "yyyy-MM-dd");
    moodByDate[k] ??= { mood: [], energy: [], focus: [] };
    if (r.mood !== null) moodByDate[k].mood.push(r.mood);
    if (r.energy !== null) moodByDate[k].energy.push(r.energy);
    if (r.focus !== null) moodByDate[k].focus.push(r.focus);
  }
  const moodTrend = Object.entries(moodByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      date,
      mood: vals.mood.length ? vals.mood.reduce((s, v) => s + v, 0) / vals.mood.length : null,
      energy: vals.energy.length ? vals.energy.reduce((s, v) => s + v, 0) / vals.energy.length : null,
      focus: vals.focus.length ? vals.focus.reduce((s, v) => s + v, 0) / vals.focus.length : null,
    }));

  // Tasks by area
  const taskByArea: Record<string, number> = {};
  for (const t of tasksDone) {
    const k = t.area?.name ?? "Unassigned";
    taskByArea[k] = (taskByArea[k] ?? 0) + 1;
  }

  // Decision rating distribution
  const ratingDist: number[] = new Array(11).fill(0);
  for (const d of decisions) {
    if (d.rating !== null) ratingDist[d.rating]++;
  }

  return NextResponse.json({
    heatmap,
    areaXp,
    areas,
    moodTrend,
    taskByArea,
    ratingDist,
    decisionsTotal: decisions.length,
    period: {
      since90: format(since90, "yyyy-MM-dd"),
      since30: format(since30, "yyyy-MM-dd"),
      now: format(now, "yyyy-MM-dd"),
    },
  });
}
