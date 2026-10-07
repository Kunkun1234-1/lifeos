import { NextResponse } from "next/server";
import { PeriodicTaskUpdateSchema } from "@lifeos/contracts/periodic-tasks";
import {
  archivePeriodicTask,
  PeriodicTaskLinkError,
  PeriodicTaskNotFoundError,
  PeriodicTaskPeriodError,
  updatePeriodicTask,
} from "@lifeos/domain/periodic-tasks";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const parsed = PeriodicTaskUpdateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "周期任务更新内容无效" }, { status: 400 });
  }
  try {
    return NextResponse.json(await updatePeriodicTask(prisma, userId, id, parsed.data));
  } catch (error) {
    if (error instanceof PeriodicTaskNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof PeriodicTaskLinkError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof PeriodicTaskPeriodError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  try {
    return NextResponse.json(await archivePeriodicTask(prisma, userId, id));
  } catch (error) {
    if (error instanceof PeriodicTaskNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
