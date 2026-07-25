import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { grantReward, deductReward } from "@/lib/rewards";
import { HabitTickSchema } from "@/lib/validators";
import { safeCheck } from "@/lib/achievements";
import {
  daySearchWindow,
  formatYMDInTz,
  middayInTz,
} from "@/lib/date";

type Params = { params: Promise<{ id: string }> };

const TICK_LOOKBACK_MS = 42 * 24 * 60 * 60 * 1000;

async function serializeHabit(habitId: string, timeZone: string) {
  const since = new Date(Date.now() - TICK_LOOKBACK_MS);
  const habit = await prisma.habit.findUnique({
    where: { id: habitId },
    include: {
      area: true,
      ticks: {
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "asc" },
        select: { id: true, direction: true, createdAt: true },
      },
    },
  });
  if (!habit) return null;
  return {
    ...habit,
    ticks: habit.ticks.map((tick) => ({
      id: tick.id,
      direction: tick.direction,
      createdAt: tick.createdAt.toISOString(),
      date: formatYMDInTz(tick.createdAt, timeZone),
    })),
  };
}

export async function POST(req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const body = await req.json();
  const { direction, date: dateInput, toggle } = HabitTickSchema.parse(body);

  const [habit, user] = await Promise.all([
    prisma.habit.findFirst({ where: { id, userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } }),
  ]);
  if (!habit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (direction === "+" && habit.direction === "negative") {
    return NextResponse.json({ error: "Direction mismatch" }, { status: 400 });
  }
  if (direction === "-" && habit.direction === "positive") {
    return NextResponse.json({ error: "Direction mismatch" }, { status: 400 });
  }

  const timeZone = user?.timezone ?? "Asia/Shanghai";
  const day =
    dateInput ?? formatYMDInTz(new Date(), timeZone);
  const today = formatYMDInTz(new Date(), timeZone);
  if (day > today) {
    return NextResponse.json({ error: "Cannot check in on a future day" }, { status: 400 });
  }

  const { start, end } = daySearchWindow(day, timeZone);
  const sameDayTicks = await prisma.habitTick.findMany({
    where: {
      habitId: id,
      direction,
      createdAt: { gte: start, lte: end },
    },
    orderBy: { createdAt: "desc" },
  });
  const existing = sameDayTicks.find(
    (tick) => formatYMDInTz(tick.createdAt, timeZone) === day,
  );

  const xp = habit.xpPerTick;
  const gold = habit.goldPerTick;

  // Toggle off: undo today's (or that day's) check-in
  if (toggle && existing) {
    await prisma.$transaction([
      prisma.habitTick.delete({ where: { id: existing.id } }),
      prisma.habit.update({
        where: { id },
        data:
          direction === "+"
            ? { positiveCount: Math.max(0, habit.positiveCount - 1) }
            : { negativeCount: Math.max(0, habit.negativeCount - 1) },
      }),
    ]);

    const reward =
      direction === "+"
        ? await deductReward({
            userId,
            xp,
            gold,
            source: "habit",
            sourceId: id,
            areaId: habit.areaId,
          })
        : await grantReward({
            userId,
            xp,
            gold,
            source: "habit",
            sourceId: id,
            areaId: habit.areaId,
          });

    const updated = await serializeHabit(id, timeZone);
    after(() => safeCheck(userId));
    return NextResponse.json({
      habit: updated,
      reward,
      toggledOff: true,
      unlocks: [],
    });
  }

  // Already checked and toggle disabled → reject duplicate
  if (existing && !toggle) {
    return NextResponse.json({ error: "Already checked in for this day" }, { status: 409 });
  }

  const at = middayInTz(day, timeZone);

  if (direction === "+") {
    const [, reward] = await Promise.all([
      prisma.$transaction([
        prisma.habit.update({
          where: { id },
          data: { positiveCount: { increment: 1 } },
        }),
        prisma.habitTick.create({
          data: {
            habitId: id,
            direction: "+",
            xpDelta: xp,
            goldDelta: gold,
            createdAt: at,
          },
        }),
      ]),
      grantReward({
        userId,
        xp,
        gold,
        source: "habit",
        sourceId: id,
        areaId: habit.areaId,
      }),
    ]);
    const updated = await serializeHabit(id, timeZone);
    after(() => safeCheck(userId));
    return NextResponse.json({
      habit: updated,
      reward,
      toggledOff: false,
      unlocks: [],
    });
  }

  const [, reward] = await Promise.all([
    prisma.$transaction([
      prisma.habit.update({
        where: { id },
        data: { negativeCount: { increment: 1 } },
      }),
      prisma.habitTick.create({
        data: {
          habitId: id,
          direction: "-",
          xpDelta: -xp,
          goldDelta: -gold,
          createdAt: at,
        },
      }),
    ]),
    deductReward({
      userId,
      xp,
      gold,
      source: "habit",
      sourceId: id,
      areaId: habit.areaId,
    }),
  ]);
  const updated = await serializeHabit(id, timeZone);
  after(() => safeCheck(userId));
  return NextResponse.json({
    habit: updated,
    reward,
    toggledOff: false,
    unlocks: [],
  });
}
