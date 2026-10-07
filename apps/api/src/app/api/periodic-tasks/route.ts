import { NextResponse } from "next/server";
import {
  PeriodicTaskCreateSchema,
  PeriodicTaskListQuerySchema,
} from "@lifeos/contracts/periodic-tasks";
import {
  createPeriodicTask,
  listPeriodicTasks,
  PeriodicTaskLinkError,
} from "@lifeos/domain/periodic-tasks";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";

export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  const url = new URL(req.url);
  const parsed = PeriodicTaskListQuerySchema.safeParse({
    frequency: url.searchParams.get("frequency"),
    date: url.searchParams.get("date") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "周期和日期参数无效" }, { status: 400 });
  }
  try {
    return NextResponse.json(await listPeriodicTasks(prisma, userId, parsed.data));
  } catch (error) {
    if (error instanceof RangeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  const parsed = PeriodicTaskCreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "周期任务内容无效" }, { status: 400 });
  }
  try {
    const task = await createPeriodicTask(prisma, userId, parsed.data);
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof PeriodicTaskLinkError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
