import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { RoutineCreateSchema } from "@/lib/validators";
import { todayYMD } from "@/lib/date";

export async function GET() {
  const userId = await getCurrentUserId();
  const today = todayYMD();
  const routines = await prisma.routine.findMany({
    where: { userId, archived: false },
    include: {
      area: true,
      completions: { where: { date: today } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(
    routines.map((r) => ({
      ...r,
      completedToday: r.completions.length > 0,
    }))
  );
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  const body = await req.json();
  const data = RoutineCreateSchema.parse(body);

  const routine = await prisma.routine.create({
    data: {
      userId,
      title: data.title,
      notes: data.notes ?? null,
      areaId: data.areaId ?? null,
      daysOfWeek: JSON.stringify(data.daysOfWeek),
      xpReward: data.xpReward ?? 15,
      goldReward: data.goldReward ?? 8,
    },
    include: { area: true },
  });
  return NextResponse.json(routine, { status: 201 });
}
