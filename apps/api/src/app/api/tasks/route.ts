import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { TaskCreateSchema } from "@/lib/validators";
import { createTask, listTasks, TaskLinkError } from "@lifeos/domain/tasks";

export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const projectId = url.searchParams.get("projectId");
  const tasks = await listTasks(prisma, userId, {
    status: status ?? undefined,
    projectId: projectId ?? undefined,
  });
  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  const body = await req.json();
  const data = TaskCreateSchema.parse(body);

  try {
    const task = await createTask(prisma, userId, data);
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof TaskLinkError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
