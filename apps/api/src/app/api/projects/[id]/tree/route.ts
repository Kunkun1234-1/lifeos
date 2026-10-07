import { NextResponse } from "next/server";
import { MILESTONE_SELECT } from "@lifeos/domain";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;

  const record = await prisma.project.findFirst({
    where: { id, userId },
    include: {
      area: true,
      goal: { select: { id: true, userId: true, objective: true } },
      milestones: {
        where: { userId },
        select: MILESTONE_SELECT,
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      },
      tasks: {
        where: { userId },
        include: {
          area: true,
          project: true,
          milestone: { select: { id: true, title: true } },
        },
        orderBy: [
          { status: "asc" },
          { dueDate: "asc" },
          { priority: "asc" },
          { createdAt: "desc" },
        ],
      },
    },
  });
  if (!record) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { milestones, tasks, goal, ...project } = record;
  return NextResponse.json({
    project: {
      ...project,
      goal: goal?.userId === userId
        ? { id: goal.id, objective: goal.objective }
        : null,
      taskCount: tasks.length,
      taskDoneCount: tasks.filter((task) => task.status === "DONE").length,
    },
    milestones,
    tasks,
  });
}
