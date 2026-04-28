import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { ProjectCreateSchema } from "@/lib/validators";

export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const projects = await prisma.project.findMany({
    where: { userId, ...(status ? { status } : {}) },
    include: {
      area: true,
      goal: true,
      tasks: { select: { id: true, status: true } },
    },
    orderBy: [{ status: "asc" }, { deadline: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(
    projects.map((p) => ({
      ...p,
      taskCount: p.tasks.length,
      taskDoneCount: p.tasks.filter((t) => t.status === "DONE").length,
    }))
  );
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  const body = await req.json();
  const data = ProjectCreateSchema.parse(body);

  const project = await prisma.project.create({
    data: {
      userId,
      title: data.title,
      deliverable: data.deliverable ?? null,
      notes: data.notes ?? null,
      areaId: data.areaId ?? null,
      goalId: data.goalId ?? null,
      status: data.status,
      startDate: data.startDate ? new Date(data.startDate) : null,
      deadline: data.deadline ? new Date(data.deadline) : null,
      xpReward: data.xpReward ?? 100,
      goldReward: data.goldReward ?? 40,
      gemsReward: data.gemsReward ?? 1,
    },
    include: { area: true, goal: true, tasks: true },
  });
  return NextResponse.json(project, { status: 201 });
}
