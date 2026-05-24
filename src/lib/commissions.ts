import { prisma } from "./prisma";
import { todayYMD, dayOfWeek } from "./date";

export type CommissionItem = {
  id: string;                                      // stable id within the day's commission
  sourceType: "task" | "habit" | "routine";
  sourceId: string;
  title: string;
  notes?: string | null;
  done: boolean;
  xp: number;
  gold: number;
  areaId: string | null;
  areaKey: string | null;
  icon?: string;
};

const PICK_COUNT = 4; // per design doc §4.3 — always 4

/**
 * Generate (or load) today's 4 daily commissions for the user.
 *
 * Strategy per doc §4.3: mix habits/routines (daily-cadence items) with 1 priority task.
 * We pick, deterministically for the day, up to 3 from {routines due today, positive habits}
 * and 1 from {open tasks with nearest due date}.
 */
export async function getOrGenerateTodayCommissions(userId: string) {
  const date = todayYMD();

  const existing = await prisma.dailyCommission.findUnique({
    where: { userId_date: { userId, date } },
  });
  if (existing) return existing;

  const items = await pickTodayItems(userId, date);

  return prisma.dailyCommission.create({
    data: {
      userId,
      date,
      items: JSON.stringify(items),
    },
  });
}

async function pickTodayItems(userId: string, date: string): Promise<CommissionItem[]> {
  const dow = dayOfWeek(date);

  // Candidate routines: scheduled for today, not archived, not already completed today.
  const routines = await prisma.routine.findMany({
    where: { userId, archived: false },
    include: { area: true, completions: { where: { date } } },
  });
  const availableRoutines = routines
    .filter((r) => {
      try {
        const days = JSON.parse(r.daysOfWeek) as number[];
        return Array.isArray(days) && days.includes(dow);
      } catch {
        return true;
      }
    })
    .filter((r) => r.completions.length === 0);

  // Candidate habits: positive or both, not archived.
  const habits = await prisma.habit.findMany({
    where: { userId, archived: false, direction: { in: ["positive", "both"] } },
    include: { area: true },
  });

  // Candidate tasks: open, ordered by (dueDate asc, priority asc).
  const tasks = await prisma.task.findMany({
    where: { userId, status: "TODO" },
    include: { area: true },
    orderBy: [{ dueDate: "asc" }, { priority: "asc" }, { createdAt: "asc" }],
    take: 3,
  });

  const picks: CommissionItem[] = [];

  // 1 task slot
  if (tasks.length > 0) {
    const t = tasks[0];
    picks.push({
      id: `task:${t.id}`,
      sourceType: "task",
      sourceId: t.id,
      title: t.title,
      notes: t.notes,
      done: false,
      xp: t.xpReward,
      gold: t.goldReward,
      areaId: t.areaId,
      areaKey: t.area?.attributeKey ?? null,
      icon: t.area?.icon,
    });
  }

  // Fill with routines first (higher priority for streaks), then habits
  const habitAndRoutinePool: CommissionItem[] = [
    ...availableRoutines.map<CommissionItem>((r) => ({
      id: `routine:${r.id}`,
      sourceType: "routine",
      sourceId: r.id,
      title: r.title,
      notes: r.notes,
      done: false,
      xp: r.xpReward,
      gold: r.goldReward,
      areaId: r.areaId,
      areaKey: r.area?.attributeKey ?? null,
      icon: r.area?.icon,
    })),
    ...habits.map<CommissionItem>((h) => ({
      id: `habit:${h.id}`,
      sourceType: "habit",
      sourceId: h.id,
      title: h.title,
      notes: h.notes,
      done: false,
      xp: h.xpPerTick,
      gold: h.goldPerTick,
      areaId: h.areaId,
      areaKey: h.area?.attributeKey ?? null,
      icon: h.area?.icon,
    })),
  ];

  // Stable shuffle based on date so same items don't rotate in jitter
  const seeded = seededShuffle(habitAndRoutinePool, date);

  for (const item of seeded) {
    if (picks.length >= PICK_COUNT) break;
    if (picks.some((p) => p.sourceId === item.sourceId && p.sourceType === item.sourceType)) continue;
    picks.push(item);
  }

  // If still under 4, pull more tasks
  if (picks.length < PICK_COUNT && tasks.length > 1) {
    for (const t of tasks.slice(1)) {
      if (picks.length >= PICK_COUNT) break;
      picks.push({
        id: `task:${t.id}`,
        sourceType: "task",
        sourceId: t.id,
        title: t.title,
        notes: t.notes,
        done: false,
        xp: t.xpReward,
        gold: t.goldReward,
        areaId: t.areaId,
        areaKey: t.area?.attributeKey ?? null,
        icon: t.area?.icon,
      });
    }
  }

  return picks;
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  const copy = [...arr];
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let i = copy.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 2654435761);
    const j = Math.abs(h) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function parseItems(raw: string): CommissionItem[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isCommissionSourceType(sourceType: unknown): sourceType is CommissionItem["sourceType"] {
  return sourceType === "task" || sourceType === "habit" || sourceType === "routine";
}

export async function hydrateCommissionItems(
  items: CommissionItem[],
  userId: string,
): Promise<CommissionItem[]> {
  const idsByType = items.reduce(
    (acc, item) => {
      if (isCommissionSourceType(item.sourceType) && typeof item.sourceId === "string") {
        acc[item.sourceType].add(item.sourceId);
      }
      return acc;
    },
    {
      task: new Set<string>(),
      habit: new Set<string>(),
      routine: new Set<string>(),
    },
  );

  const [tasks, habits, routines] = await Promise.all([
    idsByType.task.size
      ? prisma.task.findMany({
          where: { userId, id: { in: [...idsByType.task] } },
          select: { id: true, notes: true },
        })
      : [],
    idsByType.habit.size
      ? prisma.habit.findMany({
          where: { userId, id: { in: [...idsByType.habit] } },
          select: { id: true, notes: true },
        })
      : [],
    idsByType.routine.size
      ? prisma.routine.findMany({
          where: { userId, id: { in: [...idsByType.routine] } },
          select: { id: true, notes: true },
        })
      : [],
  ]);

  const notesBySource = new Map<string, string | null>();
  tasks.forEach((task) => notesBySource.set(`task:${task.id}`, task.notes));
  habits.forEach((habit) => notesBySource.set(`habit:${habit.id}`, habit.notes));
  routines.forEach((routine) => notesBySource.set(`routine:${routine.id}`, routine.notes));

  return items.map((item) => {
    if (!isCommissionSourceType(item.sourceType) || typeof item.sourceId !== "string") {
      return item;
    }
    const key = `${item.sourceType}:${item.sourceId}`;
    if (!notesBySource.has(key)) return item;
    return { ...item, notes: notesBySource.get(key) ?? null };
  });
}
