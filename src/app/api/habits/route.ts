import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { HabitCreateSchema } from "@/lib/validators";

export async function GET() {
  const userId = await getCurrentUserId();
  const habits = await prisma.habit.findMany({
    where: { userId, archived: false },
    include: { area: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(habits);
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
  return NextResponse.json(habit, { status: 201 });
}
