import { prisma } from "./prisma";
import { startOfWeekYMD, endOfWeekYMD, ymdToDate } from "./date";

/**
 * Weekly Battle Pass — per design doc §4.4.
 * — 8-10 missions per week, auto-generated covering multiple Areas
 * — Weekly XP cap: 6000 (= ~20 levels)
 * — Each level threshold = 300 XP
 * — Level rewards: gold (small), gems (medium), fate (high)
 *
 * Missions are pure JSON snapshots stored on the BP row; current/progress
 * is recomputed at read time from XpLedger / completion tables.
 */

export const BP_LEVEL_XP = 300;
export const BP_MAX_LEVEL = 20;
export const BP_WEEKLY_XP_CAP = BP_LEVEL_XP * BP_MAX_LEVEL; // 6000

export type BPMission = {
  key: string;            // identifier
  title: string;
  metric: string;         // matches what the engine knows how to compute
  target: number;
  xp: number;
  emoji: string;
  current: number;        // hydrated at read time
  done: boolean;          // hydrated at read time
};

export type LevelReward = { level: number; gold: number; gems: number; fate: number };

/** BP level rewards — escalating */
export const LEVEL_REWARDS: LevelReward[] = [
  { level: 1,  gold: 50,   gems: 0, fate: 0 },
  { level: 2,  gold: 75,   gems: 0, fate: 0 },
  { level: 3,  gold: 100,  gems: 0, fate: 0 },
  { level: 4,  gold: 120,  gems: 0, fate: 0 },
  { level: 5,  gold: 150,  gems: 1, fate: 0 },
  { level: 6,  gold: 175,  gems: 0, fate: 0 },
  { level: 7,  gold: 200,  gems: 0, fate: 0 },
  { level: 8,  gold: 225,  gems: 0, fate: 0 },
  { level: 9,  gold: 250,  gems: 0, fate: 0 },
  { level: 10, gold: 300,  gems: 2, fate: 1 },
  { level: 11, gold: 300,  gems: 0, fate: 0 },
  { level: 12, gold: 350,  gems: 0, fate: 0 },
  { level: 13, gold: 400,  gems: 0, fate: 0 },
  { level: 14, gold: 450,  gems: 0, fate: 0 },
  { level: 15, gold: 500,  gems: 3, fate: 1 },
  { level: 16, gold: 500,  gems: 0, fate: 0 },
  { level: 17, gold: 600,  gems: 0, fate: 0 },
  { level: 18, gold: 700,  gems: 0, fate: 1 },
  { level: 19, gold: 800,  gems: 0, fate: 0 },
  { level: 20, gold: 1000, gems: 5, fate: 2 },
];

/** Mission templates that the engine can auto-track. */
const MISSION_TEMPLATES: Omit<BPMission, "current" | "done">[] = [
  { key: "tasks_done_5",       title: "完成 5 个任务",       metric: "task_done_week",       target: 5,  xp: 200, emoji: "✅" },
  { key: "tasks_done_15",      title: "完成 15 个任务",      metric: "task_done_week",       target: 15, xp: 500, emoji: "✅" },
  { key: "habits_pos_15",      title: "正向习惯 +15 次",     metric: "habit_pos_week",       target: 15, xp: 250, emoji: "🎯" },
  { key: "routines_done_5",    title: "完成 5 个日程",       metric: "routine_done_week",    target: 5,  xp: 300, emoji: "🔁" },
  { key: "routines_done_15",   title: "完成 15 个日程",      metric: "routine_done_week",    target: 15, xp: 700, emoji: "🔁" },
  { key: "commission_full_3",  title: "3 天 4/4 委托达成",   metric: "commission_full_week", target: 3,  xp: 400, emoji: "🎖️" },
  { key: "commission_full_5",  title: "5 天 4/4 委托达成",   metric: "commission_full_week", target: 5,  xp: 700, emoji: "🎖️" },
  { key: "review_2",           title: "完成 2 次每日复盘",   metric: "review_week",          target: 2,  xp: 200, emoji: "📓" },
  { key: "review_5",           title: "完成 5 次每日复盘",   metric: "review_week",          target: 5,  xp: 500, emoji: "📓" },
  { key: "weekly_review",      title: "完成本周复盘",        metric: "weekly_review",        target: 1,  xp: 600, emoji: "📖" },
  { key: "xp_str_300",         title: "本周获得 300 STR XP", metric: "area_xp_week:STR",     target: 300, xp: 250, emoji: "💪" },
  { key: "xp_int_300",         title: "本周获得 300 INT XP", metric: "area_xp_week:INT",     target: 300, xp: 250, emoji: "🧠" },
  { key: "xp_cha_300",         title: "本周获得 300 CHA XP", metric: "area_xp_week:CHA",     target: 300, xp: 250, emoji: "❤️" },
  { key: "xp_wis_300",         title: "本周获得 300 WIS XP", metric: "area_xp_week:WIS",     target: 300, xp: 250, emoji: "🧘" },
  { key: "xp_cre_300",         title: "本周获得 300 CRE XP", metric: "area_xp_week:CRE",     target: 300, xp: 250, emoji: "🎨" },
  { key: "xp_gold_300",        title: "本周获得 300 GOLD XP",metric: "area_xp_week:GOLD",    target: 300, xp: 250, emoji: "💰" },
];

/**
 * Pick 9 missions for the week using a deterministic shuffle so the same
 * week always shows the same selection (no jitter on refresh).
 */
function pickMissions(weekStart: string): BPMission[] {
  const pool = [...MISSION_TEMPLATES];
  let h = 2166136261;
  for (const c of weekStart) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  for (let i = pool.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 2654435761);
    const j = Math.abs(h) % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 9).map((m) => ({ ...m, current: 0, done: false }));
}

export async function getOrCreateThisWeekBP(userId: string) {
  const weekStart = startOfWeekYMD();
  const weekEnd = endOfWeekYMD();

  const existing = await prisma.battlePass.findUnique({
    where: { userId_weekStart: { userId, weekStart } },
  });
  if (existing) return existing;

  const missions = pickMissions(weekStart);
  return prisma.battlePass.create({
    data: {
      userId,
      weekStart,
      weekEnd,
      missions: JSON.stringify(missions),
      totalXp: 0,
      level: 0,
      claimedLevels: "[]",
    },
  });
}

/**
 * Hydrate missions with live current values + return BP snapshot for UI.
 * Recomputes weekly metrics from XpLedger and completion tables on each call.
 */
export async function getBPSnapshot(userId: string) {
  const bp = await getOrCreateThisWeekBP(userId);

  const periodStart = ymdToDate(bp.weekStart, false);
  const periodEnd = ymdToDate(bp.weekEnd, true);

  // Compute weekly metrics in one shot
  const [
    weekTaskDone,
    weekHabitPos,
    weekRoutineDone,
    weekCommissionFull,
    weekReviewDaily,
    weekReviewWeekly,
    weekXpEntries,
  ] = await Promise.all([
    prisma.task.count({
      where: {
        userId,
        status: "DONE",
        completedAt: { gte: periodStart, lte: periodEnd },
      },
    }),
    prisma.habitTick.count({
      where: {
        habit: { userId },
        direction: "+",
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    }),
    prisma.routineCompletion.count({
      where: {
        routine: { userId },
        date: { gte: bp.weekStart, lte: bp.weekEnd },
      },
    }),
    prisma.dailyCommission.count({
      where: {
        userId,
        bonusClaimed: true,
        date: { gte: bp.weekStart, lte: bp.weekEnd },
      },
    }),
    prisma.review.count({
      where: {
        userId,
        kind: "daily",
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    }),
    prisma.review.count({
      where: {
        userId,
        kind: "weekly",
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    }),
    prisma.xpLedger.findMany({
      where: {
        userId,
        createdAt: { gte: periodStart, lte: periodEnd },
        amount: { gt: 0 },
      },
      select: { amount: true, areaKey: true },
    }),
  ]);

  // Tally area XP for the week
  const areaXp: Record<string, number> = {};
  let weeklyTotalXp = 0;
  for (const e of weekXpEntries) {
    weeklyTotalXp += e.amount;
    if (e.areaKey) areaXp[e.areaKey] = (areaXp[e.areaKey] ?? 0) + e.amount;
  }

  const metricMap: Record<string, number> = {
    task_done_week: weekTaskDone,
    habit_pos_week: weekHabitPos,
    routine_done_week: weekRoutineDone,
    commission_full_week: weekCommissionFull,
    review_week: weekReviewDaily,
    weekly_review: weekReviewWeekly,
  };

  const missions: BPMission[] = JSON.parse(bp.missions || "[]");
  const hydrated = missions.map((m) => {
    let current = 0;
    if (m.metric.startsWith("area_xp_week:")) {
      const key = m.metric.split(":")[1];
      current = areaXp[key] ?? 0;
    } else {
      current = metricMap[m.metric] ?? 0;
    }
    const done = current >= m.target;
    return { ...m, current, done };
  });

  // BP level: cap weekly XP at BP_WEEKLY_XP_CAP for level computation
  const cappedXp = Math.min(weeklyTotalXp, BP_WEEKLY_XP_CAP);
  const level = Math.min(BP_MAX_LEVEL, Math.floor(cappedXp / BP_LEVEL_XP));
  const xpIntoLevel = cappedXp - level * BP_LEVEL_XP;
  const xpForNext: number = BP_LEVEL_XP;

  // Persist snapshot
  if (bp.totalXp !== weeklyTotalXp || bp.level !== level || bp.missions !== JSON.stringify(hydrated)) {
    await prisma.battlePass.update({
      where: { id: bp.id },
      data: {
        totalXp: weeklyTotalXp,
        level,
        missions: JSON.stringify(hydrated),
      },
    });
  }

  const claimed: number[] = JSON.parse(bp.claimedLevels || "[]");

  return {
    id: bp.id,
    weekStart: bp.weekStart,
    weekEnd: bp.weekEnd,
    totalXp: weeklyTotalXp,
    cappedXp,
    cap: BP_WEEKLY_XP_CAP,
    level,
    xpIntoLevel,
    xpForNext,
    progress: xpForNext === 0 ? 0 : xpIntoLevel / xpForNext,
    missions: hydrated,
    claimedLevels: claimed,
    rewards: LEVEL_REWARDS,
  };
}

/**
 * Claim a BP level reward. Levels can be claimed in any order, but only if
 * the user has actually reached that level. Returns the granted reward
 * (or 4xx error metadata) — caller decides whether to push toast.
 */
export async function claimBPLevel(userId: string, level: number) {
  const snap = await getBPSnapshot(userId);
  if (level < 1 || level > BP_MAX_LEVEL) {
    return { ok: false as const, error: "Invalid level" };
  }
  if (snap.level < level) {
    return { ok: false as const, error: "Level not reached", reached: snap.level };
  }
  if (snap.claimedLevels.includes(level)) {
    return { ok: false as const, error: "Already claimed" };
  }
  const reward = LEVEL_REWARDS.find((r) => r.level === level);
  if (!reward) return { ok: false as const, error: "No reward defined" };

  // Persist claim + grant currency
  const next = [...snap.claimedLevels, level];
  const [, currency] = await prisma.$transaction([
    prisma.battlePass.update({
      where: { id: snap.id },
      data: { claimedLevels: JSON.stringify(next) },
    }),
    prisma.currency.update({
      where: { userId },
      data: {
        gold: { increment: reward.gold },
        gems: { increment: reward.gems },
        fate: { increment: reward.fate },
      },
    }),
  ]);

  return { ok: true as const, reward, claimed: next, currency };
}
