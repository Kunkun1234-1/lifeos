import { prisma } from "./prisma";

/**
 * Events / 限时活动 — Genshin's 5th rhythm layer.
 * Missions track a user-specific metric (counted from event.startsAt to now).
 * Claims are idempotent via @@unique [userId, eventId, missionKey].
 */

export type EventMission = {
  key: string;
  title: string;
  metric: EventMetric;
  target: number;
  emoji?: string;
  xpReward?: number;
  goldReward?: number;
  gemsReward?: number;
  fateReward?: number;
};

/**
 * Supported metrics — each computed against the event window
 * `[event.startsAt, now]`. Add new ones here when adding richer missions.
 */
export type EventMetric =
  | "task_done"
  | "habit_tick"
  | "routine_done"
  | "commission_full"
  | "daily_review"
  | "weekly_review"
  | "decision_logged"
  | "decision_reviewed"
  | "principle_added"
  | "note_added"
  | "project_done"
  | "goal_done";

export type EventStatus = "upcoming" | "active" | "ended";

export function eventStatus(startsAt: Date, endsAt: Date, now = new Date()): EventStatus {
  if (now < startsAt) return "upcoming";
  if (now > endsAt) return "ended";
  return "active";
}

/** Parse the missions JSON column safely. Drops malformed entries. */
export function parseMissions(raw: string): EventMission[] {
  let arr: unknown;
  try {
    arr = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  return arr.filter((m): m is EventMission => {
    if (!m || typeof m !== "object") return false;
    const o = m as Record<string, unknown>;
    return typeof o.key === "string" && typeof o.title === "string" && typeof o.metric === "string" && typeof o.target === "number";
  });
}

/**
 * Compute the metric value for a single user in a window.
 * Counts only events completed strictly within [from, to].
 */
async function computeMetric(
  userId: string,
  metric: EventMetric,
  from: Date,
  to: Date
): Promise<number> {
  switch (metric) {
    case "task_done":
      return prisma.task.count({ where: { userId, status: "DONE", completedAt: { gte: from, lte: to } } });
    case "habit_tick":
      return prisma.habitTick.count({ where: { habit: { userId }, direction: "+", createdAt: { gte: from, lte: to } } });
    case "routine_done":
      return prisma.routineCompletion.count({ where: { routine: { userId }, createdAt: { gte: from, lte: to } } });
    case "commission_full":
      return prisma.dailyCommission.count({ where: { userId, bonusClaimed: true, updatedAt: { gte: from, lte: to } } });
    case "daily_review":
      return prisma.review.count({ where: { userId, kind: "daily", createdAt: { gte: from, lte: to } } });
    case "weekly_review":
      return prisma.review.count({ where: { userId, kind: "weekly", createdAt: { gte: from, lte: to } } });
    case "decision_logged":
      return prisma.decision.count({ where: { userId, createdAt: { gte: from, lte: to } } });
    case "decision_reviewed":
      return prisma.decision.count({ where: { userId, status: "reviewed", reviewedAt: { gte: from, lte: to } } });
    case "principle_added":
      return prisma.principle.count({ where: { userId, createdAt: { gte: from, lte: to } } });
    case "note_added":
      return prisma.note.count({ where: { userId, createdAt: { gte: from, lte: to } } });
    case "project_done":
      return prisma.project.count({ where: { userId, status: "done", completedAt: { gte: from, lte: to } } });
    case "goal_done":
      return prisma.goal.count({ where: { userId, status: "done", updatedAt: { gte: from, lte: to } } });
    default:
      return 0;
  }
}

/** Snapshot of a single event with per-mission progress for a user. */
export type EventSnapshot = {
  id: string;
  key: string;
  name: string;
  description: string;
  emoji: string;
  themeColor: string;
  startsAt: string;
  endsAt: string;
  status: EventStatus;
  msToStart: number | null;
  msToEnd: number | null;
  missions: Array<{
    key: string;
    title: string;
    metric: EventMetric;
    target: number;
    current: number;
    progress: number;
    done: boolean;
    claimed: boolean;
    emoji: string;
    xpReward: number;
    goldReward: number;
    gemsReward: number;
    fateReward: number;
  }>;
  bonus: { xp: number; gold: number; gems: number; fate: number; equipmentKey: string | null };
  bonusClaimed: boolean;
  allMissionsClaimed: boolean;
};

export async function getEventSnapshot(
  userId: string,
  event: {
    id: string;
    key: string;
    name: string;
    description: string;
    emoji: string;
    themeColor: string;
    startsAt: Date;
    endsAt: Date;
    missions: string;
    bonusXp: number;
    bonusGold: number;
    bonusGems: number;
    bonusFate: number;
    bonusEquipmentKey: string | null;
  }
): Promise<EventSnapshot> {
  const now = new Date();
  const status = eventStatus(event.startsAt, event.endsAt, now);
  const missions = parseMissions(event.missions);

  const claims = await prisma.userEventClaim.findMany({
    where: { userId, eventId: event.id },
    select: { missionKey: true },
  });
  const claimedKeys = new Set(claims.map((c) => c.missionKey));

  // Compute current values in parallel
  const currentValues = await Promise.all(
    missions.map((m) => computeMetric(userId, m.metric, event.startsAt, now > event.endsAt ? event.endsAt : now))
  );

  const missionsOut = missions.map((m, i) => {
    const current = currentValues[i];
    const target = Math.max(1, m.target);
    const claimed = claimedKeys.has(m.key);
    return {
      key: m.key,
      title: m.title,
      metric: m.metric,
      target,
      current,
      progress: Math.min(1, current / target),
      done: current >= target,
      claimed,
      emoji: m.emoji ?? "✦",
      xpReward: m.xpReward ?? 0,
      goldReward: m.goldReward ?? 0,
      gemsReward: m.gemsReward ?? 0,
      fateReward: m.fateReward ?? 0,
    };
  });

  const allMissionsClaimed = missionsOut.length > 0 && missionsOut.every((m) => m.claimed);
  const bonusKey = `__bonus__:${event.id}`;
  const bonusClaimed = claimedKeys.has(bonusKey);

  return {
    id: event.id,
    key: event.key,
    name: event.name,
    description: event.description,
    emoji: event.emoji,
    themeColor: event.themeColor,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    status,
    msToStart: status === "upcoming" ? event.startsAt.getTime() - now.getTime() : null,
    msToEnd: status === "active" ? event.endsAt.getTime() - now.getTime() : null,
    missions: missionsOut,
    bonus: {
      xp: event.bonusXp,
      gold: event.bonusGold,
      gems: event.bonusGems,
      fate: event.bonusFate,
      equipmentKey: event.bonusEquipmentKey,
    },
    bonusClaimed,
    allMissionsClaimed,
  };
}

/** Sentinel mission key used to mark the bonus claim. */
export const BONUS_MISSION_KEY = (eventId: string) => `__bonus__:${eventId}`;
