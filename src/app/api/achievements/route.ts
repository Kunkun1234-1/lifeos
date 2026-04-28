import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/user";
import { getAchievementsSnapshot, safeCheck } from "@/lib/achievements";

export async function GET() {
  const userId = await getCurrentUserId();
  // Trigger any pending unlocks before serving
  await safeCheck(userId);
  const snapshot = await getAchievementsSnapshot(userId);
  return NextResponse.json(snapshot);
}
