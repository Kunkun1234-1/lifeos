import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/user";
import { claimBPLevel } from "@/lib/battlepass";
import { safeCheck } from "@/lib/achievements";

const Body = z.object({ level: z.number().int().min(1).max(20) });

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  const body = await req.json();
  const { level } = Body.parse(body);

  const result = await claimBPLevel(userId, level);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }
  const unlocks = await safeCheck(userId);
  return NextResponse.json({ ...result, unlocks });
}
