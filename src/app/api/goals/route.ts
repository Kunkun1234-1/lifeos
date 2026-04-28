import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { GoalCreateSchema } from "@/lib/validators";

export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const goals = await prisma.goal.findMany({
    where: { userId, ...(status ? { status } : {}) },
    include: { keyResults: { orderBy: { order: "asc" } }, area: true, projects: true },
    orderBy: [{ status: "asc" }, { endDate: "asc" }],
  });
  return NextResponse.json(goals);
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  const body = await req.json();
  const data = GoalCreateSchema.parse(body);

  // Default timeframe windows for the current year if not specified
  const now = new Date();
  const startDate = data.startDate ? new Date(data.startDate) : now;
  const endDate = data.endDate
    ? new Date(data.endDate)
    : new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());

  const goal = await prisma.goal.create({
    data: {
      userId,
      type: data.type,
      objective: data.objective,
      notes: data.notes ?? null,
      areaId: data.areaId ?? null,
      timeframe: data.timeframe,
      startDate,
      endDate,
      confidence: data.confidence ?? 5,
      keyResults: {
        create: (data.keyResults ?? []).map((kr, i) => ({
          description: kr.description,
          unit: kr.unit ?? null,
          target: kr.target,
          current: kr.current ?? 0,
          order: i,
        })),
      },
    },
    include: { keyResults: true, area: true, projects: true },
  });
  return NextResponse.json(goal, { status: 201 });
}
