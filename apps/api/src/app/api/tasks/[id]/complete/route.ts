import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { safeCheck } from "@/lib/achievements";
import {
  completeTask,
  TaskAlreadyCompleteError,
  TaskNotFoundError,
} from "@lifeos/domain/tasks";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;

  let result;
  try {
    result = await completeTask(prisma, userId, id);
  } catch (error) {
    if (error instanceof TaskNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof TaskAlreadyCompleteError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }

  // safeCheck runs 16 parallel COUNT queries — push it past the response
  // boundary so the client sees "done" in ~ms instead of waiting on the
  // achievement scan. New unlocks surface on the next /api/achievements fetch.
  after(() => safeCheck(userId));

  return NextResponse.json({ ...result, unlocks: [] });
}
