import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/user";
import { getResinSnapshot, RESIN_COSTS } from "@/lib/resin";

export async function GET() {
  const userId = await getCurrentUserId();
  const state = await getResinSnapshot(userId);
  return NextResponse.json({
    ...state,
    costs: RESIN_COSTS,
  });
}
