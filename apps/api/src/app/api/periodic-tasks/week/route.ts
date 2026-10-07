import { NextResponse } from "next/server";
import { DailyTaskWeekQuerySchema } from "@lifeos/contracts/periodic-tasks";
import { listDailyTaskWeek } from "@lifeos/domain/periodic-tasks";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";

export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  const url = new URL(req.url);
  const parsed = DailyTaskWeekQuerySchema.safeParse({
    date: url.searchParams.get("date") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "周视图日期参数无效" }, { status: 400 });
  }

  try {
    return NextResponse.json(await listDailyTaskWeek(prisma, userId, parsed.data));
  } catch (error) {
    if (error instanceof RangeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
