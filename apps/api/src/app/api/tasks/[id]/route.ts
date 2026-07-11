import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { TaskUpdateSchema } from "@/lib/validators";
import {
  deleteTask,
  TaskLinkError,
  TaskNotFoundError,
  updateTask,
} from "@lifeos/domain/tasks";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const body = await req.json();
  const data = TaskUpdateSchema.parse(body);

  try {
    return NextResponse.json(await updateTask(prisma, userId, id, data));
  } catch (error) {
    if (error instanceof TaskNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof TaskLinkError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  try {
    await deleteTask(prisma, userId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof TaskNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
