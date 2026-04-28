import { prisma } from "./prisma";
import { grantReward } from "./rewards";
import { deriveLevel } from "./gamification";
import { Prisma } from "@prisma/client";

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

/**
 * Achievement engine — call after any meaningful state change to detect newly
 * unlocked achievements. Idempotent (safe to call repeatedly; existing unlocks
 * are skipped via the unique constraint).
 *
 * Returns the list of NEWLY unlocked achievements (with reward grant info).
 */
export type UnlockResult = {
  id: string;
  key: string;
  name: string;
  emoji: string;
  tier: string;
  rewardGold: number;
  rewardGems: number;
  rewardFate: number;
};

export async function checkAchievements(userId: string): Promise<UnlockResult[]> {
  const allDefs = await prisma.achievement.findMany();
  const existing = await prisma.achievementUnlock.findMany({
    where: { userId },
    select: { achievementId: true },
  });
  const unlockedSet = new Set(existing.map((u) => u.achievementId));

  // Compute all metrics in parallel
  const [
    taskDoneCount,
    habitTickCount,
    routineTotal,
    bestStreak,
    dailyReviewCount,
    weeklyReviewCount,
    fullCommissionCount,
    projectDoneCount,
    goalDoneCount,
    totalXp,
    bpLevelMax,
    principleCount,
    decisionCount,
    decisionReviewedCount,
    noteCount,
  ] = await Promise.all([
    prisma.task.count({ where: { userId, status: "DONE" } }),
    prisma.habitTick.count({ where: { habit: { userId }, direction: "+" } }),
    prisma.routineCompletion.count({ where: { routine: { userId } } }),
    prisma.routine
      .aggregate({ where: { userId }, _max: { streakBest: true } })
      .then((r) => r._max.streakBest ?? 0),
    prisma.review.count({ where: { userId, kind: "daily" } }),
    prisma.review.count({ where: { userId, kind: "weekly" } }),
    prisma.dailyCommission.count({ where: { userId, bonusClaimed: true } }),
    prisma.project.count({ where: { userId, status: "done" } }),
    prisma.goal.count({ where: { userId, status: "done" } }),
    prisma.xpLedger
      .aggregate({ where: { userId }, _sum: { amount: true } })
      .then((r) => Math.max(0, r._sum.amount ?? 0)),
    prisma.battlePass
      .aggregate({ where: { userId }, _max: { level: true } })
      .then((r) => r._max.level ?? 0),
    prisma.principle.count({ where: { userId, archived: false } }),
    prisma.decision.count({ where: { userId } }),
    prisma.decision.count({ where: { userId, status: "reviewed" } }),
    prisma.note.count({ where: { userId, archived: false } }),
  ]);

  const { level } = deriveLevel(totalXp);

  const metricMap: Record<string, number> = {
    task_done_count: taskDoneCount,
    habit_tick_count: habitTickCount,
    routine_total: routineTotal,
    routine_streak_max: bestStreak,
    daily_review_count: dailyReviewCount,
    weekly_review_count: weeklyReviewCount,
    commission_full_count: fullCommissionCount,
    project_done_count: projectDoneCount,
    goal_done_count: goalDoneCount,
    total_xp: totalXp,
    level,
    bp_level_max: bpLevelMax,
    principle_count: principleCount,
    decision_count: decisionCount,
    decision_reviewed_count: decisionReviewedCount,
    note_count: noteCount,
  };

  const newlyUnlocked: UnlockResult[] = [];
  for (const def of allDefs) {
    if (unlockedSet.has(def.id)) continue;

    const [metric, thresholdRaw] = def.trigger.split(":");
    const threshold = Number(thresholdRaw);
    if (Number.isNaN(threshold)) continue;
    const value = metricMap[metric];
    if (value === undefined) continue;

    if (value >= threshold) {
      try {
        await prisma.achievementUnlock.create({
          data: { userId, achievementId: def.id },
        });
        // Grant reward
        if (def.rewardGold + def.rewardGems + def.rewardFate > 0) {
          await grantReward({
            userId,
            xp: 0,
            gold: def.rewardGold,
            gems: def.rewardGems,
            fate: def.rewardFate,
            source: "bonus",
            sourceId: def.id,
            areaId: null,
          });
        }
        // Cascade: unlock matching title (if any) for this achievement.
        // Idempotent via unique [userId, titleKey].
        const matchingTitles = await prisma.title.findMany({
          where: { sourceAchievementKey: def.key },
          select: { key: true },
        });
        for (const t of matchingTitles) {
          try {
            await prisma.userTitle.create({
              data: { userId, titleKey: t.key },
            });
          } catch (e) {
            if (!isUniqueViolation(e)) throw e;
          }
        }
        newlyUnlocked.push({
          id: def.id,
          key: def.key,
          name: def.name,
          emoji: def.emoji,
          tier: def.tier,
          rewardGold: def.rewardGold,
          rewardGems: def.rewardGems,
          rewardFate: def.rewardFate,
        });
      } catch (e) {
        // Likely race on unique constraint — skip silently.
        if (!isUniqueViolation(e)) throw e;
      }
    }
  }

  return newlyUnlocked;
}

/**
 * For UI: snapshot of locked + unlocked achievements, with progress per metric.
 */
export async function getAchievementsSnapshot(userId: string) {
  const defs = await prisma.achievement.findMany({
    orderBy: [{ tier: "asc" }, { category: "asc" }],
  });
  const unlocks = await prisma.achievementUnlock.findMany({
    where: { userId },
  });
  const unlockMap = new Map(unlocks.map((u) => [u.achievementId, u.unlockedAt]));

  const [
    taskDoneCount,
    habitTickCount,
    routineTotal,
    bestStreak,
    dailyReviewCount,
    weeklyReviewCount,
    fullCommissionCount,
    projectDoneCount,
    goalDoneCount,
    totalXp,
    bpLevelMax,
    principleCount,
    decisionCount,
    decisionReviewedCount,
    noteCount,
  ] = await Promise.all([
    prisma.task.count({ where: { userId, status: "DONE" } }),
    prisma.habitTick.count({ where: { habit: { userId }, direction: "+" } }),
    prisma.routineCompletion.count({ where: { routine: { userId } } }),
    prisma.routine
      .aggregate({ where: { userId }, _max: { streakBest: true } })
      .then((r) => r._max.streakBest ?? 0),
    prisma.review.count({ where: { userId, kind: "daily" } }),
    prisma.review.count({ where: { userId, kind: "weekly" } }),
    prisma.dailyCommission.count({ where: { userId, bonusClaimed: true } }),
    prisma.project.count({ where: { userId, status: "done" } }),
    prisma.goal.count({ where: { userId, status: "done" } }),
    prisma.xpLedger
      .aggregate({ where: { userId }, _sum: { amount: true } })
      .then((r) => Math.max(0, r._sum.amount ?? 0)),
    prisma.battlePass
      .aggregate({ where: { userId }, _max: { level: true } })
      .then((r) => r._max.level ?? 0),
    prisma.principle.count({ where: { userId, archived: false } }),
    prisma.decision.count({ where: { userId } }),
    prisma.decision.count({ where: { userId, status: "reviewed" } }),
    prisma.note.count({ where: { userId, archived: false } }),
  ]);
  const { level } = deriveLevel(totalXp);
  const metricMap: Record<string, number> = {
    task_done_count: taskDoneCount,
    habit_tick_count: habitTickCount,
    routine_total: routineTotal,
    routine_streak_max: bestStreak,
    daily_review_count: dailyReviewCount,
    weekly_review_count: weeklyReviewCount,
    commission_full_count: fullCommissionCount,
    project_done_count: projectDoneCount,
    goal_done_count: goalDoneCount,
    total_xp: totalXp,
    level,
    bp_level_max: bpLevelMax,
    principle_count: principleCount,
    decision_count: decisionCount,
    decision_reviewed_count: decisionReviewedCount,
    note_count: noteCount,
  };

  return defs.map((d) => {
    const unlockedAt = unlockMap.get(d.id) ?? null;
    const [metric, thresholdRaw] = d.trigger.split(":");
    const threshold = Number(thresholdRaw);
    const current = metricMap[metric] ?? 0;
    return {
      id: d.id,
      key: d.key,
      name: d.name,
      description: d.description,
      emoji: d.emoji,
      tier: d.tier,
      category: d.category,
      hidden: d.hidden,
      threshold,
      current,
      progress: threshold > 0 ? Math.min(1, current / threshold) : 0,
      unlocked: !!unlockedAt,
      unlockedAt,
      reward: { gold: d.rewardGold, gems: d.rewardGems, fate: d.rewardFate },
    };
  });
}

/** Convenience guard so achievement checks can be opt-in per request */
export async function safeCheck(userId: string): Promise<UnlockResult[]> {
  try {
    return await checkAchievements(userId);
  } catch (e) {
    console.error("[achievements] check failed", e);
    return [];
  }
}

// Type alias to avoid unused import warnings in callers
export type { Prisma };
