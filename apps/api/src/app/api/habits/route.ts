import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { HabitCreateSchema } from "@/lib/validators";
import { formatYMDInTz } from "@/lib/date";

const TICK_LOOKBACK_MS = 42 * 24 * 60 * 60 * 1000;

export async function GET() {
  const userId = await getCurrentUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  const timeZone = user?.timezone ?? "Asia/Shanghai";
  const since = new Date(Date.now() - TICK_LOOKBACK_MS);

  const habits = await prisma.habit.findMany({
    where: { userId, archived: false },
    include: {
      area: true,
      ticks: {
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          direction: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    habits.map((habit) => ({
      ...habit,
      ticks: habit.ticks.map((tick) => ({
        id: tick.id,
        direction: tick.direction,
        createdAt: tick.createdAt.toISOString(),
        date: formatYMDInTz(tick.createdAt, timeZone),
      })),
    })),
  );
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  const body = await req.json();
  const data = HabitCreateSchema.parse(body);

  const habit = await prisma.habit.create({
    data: {
      userId,
      title: data.title,
      notes: data.notes ?? null,
      areaId: data.areaId ?? null,
      direction: data.direction,
      xpPerTick: data.xpPerTick ?? 5,
      goldPerTick: data.goldPerTick ?? 2,
    },
    include: { area: true },
  });
  return NextResponse.json({ ...habit, ticks: [] }, { status: 201 });
}
