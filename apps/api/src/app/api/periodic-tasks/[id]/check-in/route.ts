import { NextResponse, after } from "next/server";
import { PeriodicTaskCheckInSchema } from "@lifeos/contracts/periodic-tasks";
import {
  PeriodicTaskNotFoundError,
  PeriodicTaskPeriodError,
  setPeriodicTaskCompletion,
} from "@lifeos/domain/periodic-tasks";
import { safeCheck } from "@/lib/achievements";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const parsed = PeriodicTaskCheckInSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "打卡请求无效" }, { status: 400 });
  }
  try {
    const result = await setPeriodicTaskCompletion(prisma, userId, id, parsed.data);
    if (result.changed) after(() => safeCheck(userId));
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PeriodicTaskNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof PeriodicTaskPeriodError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
