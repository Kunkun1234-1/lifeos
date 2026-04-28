import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { TaskCreateSchema } from "@/lib/validators";

export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const projectId = url.searchParams.get("projectId");
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      ...(status ? { status } : {}),
      ...(projectId ? { projectId } : {}),
    },
    include: { area: true, project: true },
    orderBy: [
      { status: "asc" },
      { dueDate: "asc" },
      { priority: "asc" },
      { createdAt: "desc" },
    ],
  });
  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  const body = await req.json();
  const data = TaskCreateSchema.parse(body);

  const task = await prisma.task.create({
    data: {
      userId,
      title: data.title,
      notes: data.notes ?? null,
      areaId: data.areaId ?? null,
      projectId: data.projectId ?? null,
      priority: data.priority ?? 2,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      xpReward: data.xpReward ?? 10,
      goldReward: data.goldReward ?? 5,
    },
    include: { area: true, project: true },
  });
  return NextResponse.json(task, { status: 201 });
}
