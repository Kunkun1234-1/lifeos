import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/user";
import {
  getAchievementMetrics,
  getAchievementsSnapshot,
  safeCheck,
} from "@/lib/achievements";

export async function GET() {
  const userId = await getCurrentUserId();
  // The page and unlock check need the same 15 statistics. Share the in-flight
  // computation so a first visit does not execute the full query set twice.
  const metrics = getAchievementMetrics(userId);
  await safeCheck(userId, metrics);
  const snapshot = await getAchievementsSnapshot(userId, metrics);
  return NextResponse.json(snapshot);
}
