import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { GoalCreateSchema } from "@lifeos/contracts/goals";
import { createGoal, GoalLinkError } from "@lifeos/domain/goals";

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

  try {
    const goal = await createGoal(prisma, userId, data);
    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    if (error instanceof GoalLinkError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
