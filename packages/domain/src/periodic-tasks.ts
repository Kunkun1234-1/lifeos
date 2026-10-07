import { Prisma, type PrismaClient } from "@prisma/client";
import type {
  DailyTaskWeekSnapshot,
  PeriodicTaskCheckInInput,
  PeriodicTaskCreateInput,
  PeriodicTaskDTO,
  PeriodicTaskFrequency,
  PeriodicTaskUpdateInput,
  PeriodicTasksSnapshot,
} from "@lifeos/contracts/periodic-tasks";
import { grantRewardInTransaction } from "./rewards";

const AREA_SELECT = {
  id: true,
  name: true,
  icon: true,
  color: true,
} as const;

const TASK_INCLUDE = {
  area: { select: AREA_SELECT },
} as const;

const FREQUENCIES = new Set<PeriodicTaskFrequency>([
  "DAILY",
  "WEEKLY",
  "MONTHLY",
]);

type PeriodicTaskRecord = Prisma.PeriodicTaskGetPayload<{
  include: typeof TASK_INCLUDE;
}>;

export class PeriodicTaskNotFoundError extends Error {}
export class PeriodicTaskLinkError extends Error {}
export class PeriodicTaskPeriodError extends Error {}

export function getPeriodicPeriod(
  frequency: PeriodicTaskFrequency,
  date: string | Date,
) {
  if (!FREQUENCIES.has(frequency)) {
    throw new RangeError(`Unsupported periodic task frequency: ${frequency}`);
  }
  const ymd = normalizeYmd(date);
  if (frequency === "DAILY") {
    return { periodKey: ymd, periodStart: ymd, periodEnd: ymd };
  }

  const parsed = parseYmd(ymd);
  if (frequency === "WEEKLY") {
    const day = parsed.getUTCDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const start = addUtcDays(parsed, mondayOffset);
    const end = addUtcDays(start, 6);
    const periodStart = formatUtcYmd(start);
    return {
      periodKey: periodStart,
      periodStart,
      periodEnd: formatUtcYmd(end),
    };
  }

  const year = parsed.getUTCFullYear();
  const month = parsed.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 0));
  const periodStart = formatUtcYmd(start);
  return {
    periodKey: periodStart,
    periodStart,
    periodEnd: formatUtcYmd(end),
  };
}

export function formatYmdInTimeZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function listPeriodicTasks(
  db: PrismaClient,
  userId: string,
  input: {
    frequency: PeriodicTaskFrequency;
    date?: string;
    now?: Date;
  },
): Promise<PeriodicTasksSnapshot> {
  const now = input.now ?? new Date();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  const timeZone = user?.timezone ?? "Asia/Shanghai";
  const today = formatYmdInTimeZone(now, timeZone);
  const selectedDate = input.date ?? today;
  const period = getPeriodicPeriod(input.frequency, selectedDate);
  if (selectedDate > today) {
    throw new RangeError("不能查看未来周期的任务状态");
  }
  const isCurrentPeriod = period.periodStart <= today && today <= period.periodEnd;

  const tasks = await db.periodicTask.findMany({
    where: {
      userId,
      OR: [
        { frequency: input.frequency, archived: false },
        ...(!isCurrentPeriod ? [{
          checkIns: {
            some: {
              frequency: input.frequency,
              periodKey: period.periodKey,
            },
          },
        }] : []),
      ],
    },
    include: {
      ...TASK_INCLUDE,
      checkIns: {
        where: {
          frequency: input.frequency,
          periodKey: period.periodKey,
        },
        take: 1,
      },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  return {
    frequency: input.frequency,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    today,
    timeZone,
    tasks: tasks
      .filter((task) => formatYmdInTimeZone(task.createdAt, timeZone) <= period.periodEnd)
      .map((task) => toDto(task, task.checkIns[0] ?? null, input.frequency)),
  };
}

export async function listDailyTaskWeek(
  db: PrismaClient,
  userId: string,
  input: {
    date?: string;
    now?: Date;
  },
): Promise<DailyTaskWeekSnapshot> {
  const now = input.now ?? new Date();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  const timeZone = user?.timezone ?? "Asia/Shanghai";
  const today = formatYmdInTimeZone(now, timeZone);
  const selectedDate = input.date ?? today;
  const period = getPeriodicPeriod("WEEKLY", selectedDate);
  if (selectedDate > today) {
    throw new RangeError("不能查看未来日期的每日任务周视图");
  }

  const days = Array.from({ length: 7 }, (_value, index) =>
    formatUtcYmd(addUtcDays(parseYmd(period.periodStart), index))
  );
  const checkInEnd = period.periodEnd < today ? period.periodEnd : today;
  const isCurrentWeek = period.periodStart <= today && today <= period.periodEnd;

  const tasks = await db.periodicTask.findMany({
    where: {
      userId,
      OR: [
        { frequency: "DAILY", archived: false },
        {
          checkIns: {
            some: {
              frequency: "DAILY",
              periodKey: {
                gte: period.periodStart,
                lte: checkInEnd,
              },
            },
          },
        },
      ],
    },
    include: {
      ...TASK_INCLUDE,
      checkIns: {
        where: {
          frequency: "DAILY",
          periodKey: {
            gte: period.periodStart,
            lte: checkInEnd,
          },
        },
        orderBy: { periodKey: "asc" },
      },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  return {
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    today,
    timeZone,
    days,
    tasks: tasks.flatMap((task) => {
      const createdDate = formatYmdInTimeZone(task.createdAt, timeZone);
      if (createdDate > period.periodEnd) return [];

      const hasHistoricalCheckIn = task.checkIns.length > 0;
      const isActiveDaily = task.frequency === "DAILY" && !task.archived;
      if (!isActiveDaily && !hasHistoricalCheckIn) return [];
      if (isCurrentWeek && !isActiveDaily) return [];

      const completedDates = task.checkIns.map((checkIn) => checkIn.periodKey);
      const todayCheckIn = task.checkIns.find(
        (checkIn) => checkIn.periodKey === today,
      ) ?? null;
      return [{
        ...toDto(task, todayCheckIn, "DAILY"),
        availableFrom: createdDate > period.periodStart
          ? createdDate
          : period.periodStart,
        completedDates,
      }];
    }),
  };
}

export async function createPeriodicTask(
  db: PrismaClient,
  userId: string,
  data: PeriodicTaskCreateInput,
): Promise<PeriodicTaskDTO> {
  await assertOwnedArea(db, userId, data.areaId);
  const task = await db.periodicTask.create({
    data: {
      userId,
      title: data.title,
      notes: data.notes ?? null,
      areaId: data.areaId ?? null,
      frequency: data.frequency,
      xpReward: data.xpReward ?? 5,
      goldReward: data.goldReward ?? 2,
    },
    include: TASK_INCLUDE,
  });
  return toDto(task, null);
}

export async function updatePeriodicTask(
  db: PrismaClient,
  userId: string,
  taskId: string,
  data: PeriodicTaskUpdateInput,
  now: Date = new Date(),
): Promise<PeriodicTaskDTO> {
  return db.$transaction(async (tx) => {
    const existing = await lockOwnedTask(tx, userId, taskId);
    if (!existing || existing.archived) {
      throw new PeriodicTaskNotFoundError("周期任务不存在");
    }
    await assertOwnedArea(tx, userId, data.areaId);

    if (data.frequency && data.frequency !== existing.frequency) {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { timezone: true },
      });
      const today = formatYmdInTimeZone(now, user?.timezone ?? "Asia/Shanghai");
      const current = getPeriodicPeriod(existing.frequency, today);
      const completed = await tx.periodicTaskCheckIn.findUnique({
        where: {
          taskId_frequency_periodKey: {
            taskId,
            frequency: existing.frequency,
            periodKey: current.periodKey,
          },
        },
        select: { id: true },
      });
      if (completed) {
        throw new PeriodicTaskPeriodError(
          "请先撤销当前周期的打卡，再修改任务周期",
        );
      }
    }

    const task = await tx.periodicTask.update({
      where: { id: taskId },
      data: {
        title: data.title,
        notes: data.notes,
        areaId: data.areaId,
        frequency: data.frequency,
        xpReward: data.xpReward,
        goldReward: data.goldReward,
      },
      include: TASK_INCLUDE,
    });
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    const today = formatYmdInTimeZone(now, user?.timezone ?? "Asia/Shanghai");
    const period = getPeriodicPeriod(task.frequency, today);
    const checkIn = await tx.periodicTaskCheckIn.findUnique({
      where: {
        taskId_frequency_periodKey: {
          taskId,
          frequency: task.frequency,
          periodKey: period.periodKey,
        },
      },
      select: { completedAt: true },
    });
    return toDto(task, checkIn);
  });
}

export async function archivePeriodicTask(
  db: PrismaClient,
  userId: string,
  taskId: string,
) {
  return db.$transaction(async (tx) => {
    const existing = await lockOwnedTask(tx, userId, taskId);
    if (!existing) throw new PeriodicTaskNotFoundError("周期任务不存在");
    if (!existing.archived) {
      await tx.periodicTask.update({
        where: { id: taskId },
        data: { archived: true },
      });
    }
    return { ok: true };
  });
}

export async function setPeriodicTaskCompletion(
  db: PrismaClient,
  userId: string,
  taskId: string,
  input: PeriodicTaskCheckInInput,
  now: Date = new Date(),
) {
  return db.$transaction(async (tx) => {
    const task = await lockOwnedTask(tx, userId, taskId);
    if (!task || task.archived) {
      throw new PeriodicTaskNotFoundError("周期任务不存在");
    }
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    const timeZone = user?.timezone ?? "Asia/Shanghai";
    const today = formatYmdInTimeZone(now, timeZone);
    const period = getPeriodicPeriod(task.frequency, today);
    if (input.periodKey && input.periodKey !== period.periodKey) {
      throw new PeriodicTaskPeriodError(
        "只能打卡或撤销当前周期，不能补领过去或未来周期的奖励",
      );
    }

    const key = {
      taskId,
      frequency: task.frequency,
      periodKey: period.periodKey,
    };
    const existing = await tx.periodicTaskCheckIn.findUnique({
      where: { taskId_frequency_periodKey: key },
    });

    if (input.completed) {
      if (existing) {
        return completionResult(tx, taskId, existing, true, false);
      }
      const checkIn = await tx.periodicTaskCheckIn.create({
        data: {
          ...key,
          xpGranted: task.xpReward,
          goldGranted: task.goldReward,
          areaId: task.areaId,
          completedAt: now,
        },
      });
      const reward = await grantRewardInTransaction(tx, {
        userId,
        xp: checkIn.xpGranted,
        gold: checkIn.goldGranted,
        source: "routine",
        sourceId: checkIn.id,
        areaId: checkIn.areaId,
      });
      const result = await completionResult(tx, taskId, checkIn, true, true);
      return { ...result, reward };
    }

    if (!existing) {
      return completionResult(tx, taskId, null, false, false);
    }
    const reward = await reverseCheckInReward(tx, userId, existing);
    await tx.periodicTaskCheckIn.delete({ where: { id: existing.id } });
    const result = await completionResult(tx, taskId, null, false, true);
    return { ...result, reward };
  });
}

async function completionResult(
  tx: Prisma.TransactionClient,
  taskId: string,
  checkIn: { completedAt: Date } | null,
  completed: boolean,
  changed: boolean,
) {
  const task = await tx.periodicTask.findUniqueOrThrow({
    where: { id: taskId },
    include: TASK_INCLUDE,
  });
  return {
    task: toDto(task, checkIn),
    changed,
    already: !changed,
    reward: null,
    completed,
  };
}

async function reverseCheckInReward(
  tx: Prisma.TransactionClient,
  userId: string,
  checkIn: {
    id: string;
    xpGranted: number;
    goldGranted: number;
    areaId: string | null;
  },
) {
  const xp = Math.max(0, checkIn.xpGranted);
  const gold = Math.max(0, checkIn.goldGranted);
  const area = checkIn.areaId
    ? await tx.area.findFirst({
        where: { id: checkIn.areaId, userId },
        select: { id: true, attributeKey: true, attributeXp: true },
      })
    : null;
  const areaKey = normalizeAreaKey(area?.attributeKey);

  if (xp > 0) {
    await tx.xpLedger.create({
      data: {
        userId,
        amount: -xp,
        source: "routine",
        sourceId: checkIn.id,
        areaKey,
      },
    });
    if (area) {
      await tx.$executeRaw(Prisma.sql`
        UPDATE "Area"
        SET "attributeXp" = GREATEST(0, "attributeXp" - ${xp}),
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${area.id} AND "userId" = ${userId}
      `);
    }
  }

  await tx.currency.upsert({
    where: { userId },
    create: { userId, gold: 0 },
    update: {},
  });
  await tx.$executeRaw(Prisma.sql`
    UPDATE "Currency"
    SET "gold" = GREATEST(0, "gold" - ${gold}),
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "userId" = ${userId}
  `);
  const updatedCurrency = await tx.currency.findUniqueOrThrow({ where: { userId } });
  return {
    xpGranted: -xp,
    goldGranted: -gold,
    gemsGranted: 0,
    fateGranted: 0,
    areaKey,
    currency: updatedCurrency,
  };
}

async function lockOwnedTask(
  tx: Prisma.TransactionClient,
  userId: string,
  taskId: string,
) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id"
    FROM "PeriodicTask"
    WHERE "id" = ${taskId} AND "userId" = ${userId}
    FOR UPDATE
  `);
  if (rows.length === 0) return null;
  return tx.periodicTask.findUnique({ where: { id: taskId } });
}

async function assertOwnedArea(
  db: PrismaClient | Prisma.TransactionClient,
  userId: string,
  areaId: string | null | undefined,
) {
  if (!areaId) return;
  const area = await db.area.findFirst({
    where: { id: areaId, userId, archived: false },
    select: { id: true },
  });
  if (!area) throw new PeriodicTaskLinkError("领域不存在或不属于当前用户");
}

function toDto(
  task: PeriodicTaskRecord,
  checkIn: { completedAt: Date } | null,
  frequency: PeriodicTaskFrequency = task.frequency,
): PeriodicTaskDTO {
  return {
    id: task.id,
    title: task.title,
    notes: task.notes,
    areaId: task.areaId,
    area: task.area,
    frequency,
    xpReward: task.xpReward,
    goldReward: task.goldReward,
    completed: Boolean(checkIn),
    completedAt: checkIn?.completedAt.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

function normalizeYmd(value: string | Date) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new RangeError("Invalid date");
    return formatUtcYmd(value);
  }
  parseYmd(value);
  return value;
}

function parseYmd(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError("Date must use YYYY-MM-DD");
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (formatUtcYmd(date) !== value) throw new RangeError("Invalid date");
  return date;
}

function addUtcDays(date: Date, amount: number) {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + amount);
  return result;
}

function formatUtcYmd(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function normalizeAreaKey(value: string | null | undefined) {
  return value && ["STR", "INT", "CHA", "WIS", "CRE", "GOLD"].includes(value)
    ? value
    : null;
}
