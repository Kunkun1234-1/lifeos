import { NextResponse } from "next/server";
import { MILESTONE_SELECT } from "@lifeos/domain";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;

  const record = await prisma.goal.findFirst({
    where: { id, userId },
    include: {
      area: true,
      keyResults: { orderBy: { order: "asc" } },
      projects: {
        where: { userId },
        include: {
          area: true,
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
        orderBy: [{ status: "asc" }, { deadline: "asc" }, { createdAt: "desc" }],
      },
    },
  });
  if (!record) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const { projects, ...goalFields } = record;
  const goal = {
    ...goalFields,
    projects: projects.map((project) => ({
      id: project.id,
      title: project.title,
      status: project.status,
    })),
  };

  return NextResponse.json({
    goal,
    projects: projects.map((recordProject) => {
      const { milestones, tasks, ...projectFields } = recordProject;
      return {
        project: {
          ...projectFields,
          goal: { id: goal.id, objective: goal.objective },
          taskCount: tasks.length,
          taskDoneCount: tasks.filter((task) => task.status === "DONE").length,
        },
        milestones,
        tasks,
      };
    }),
  });
}
