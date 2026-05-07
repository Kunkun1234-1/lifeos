import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { grantReward } from "@/lib/rewards";

/**
 * Manual-unlock endpoint. Only works for achievements with trigger === "manual"
 * (created via /api/achievements/custom). Awards the configured reward.
 */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  const { id } = await params;

  const ach = await prisma.achievement.findUnique({ where: { id } });
  if (!ach) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ach.trigger !== "manual") {
    return NextResponse.json(
      { error: "This achievement is auto-tracked; cannot manually unlock." },
      { status: 400 },
    );
  }
  if (ach.ownerUserId && ach.ownerUserId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.achievementUnlock.findUnique({
    where: { userId_achievementId: { userId, achievementId: ach.id } },
  });
  if (existing) {
    return NextResponse.json({ alreadyUnlocked: true });
  }

  await prisma.achievementUnlock.create({
    data: { userId, achievementId: ach.id },
  });

  // Grant reward (gold/gems/fate) — uses the bonus source bucket so it shows
  // up in analytics distinctly from task/habit/etc.
  if (ach.rewardGold || ach.rewardGems || ach.rewardFate) {
    await grantReward({
      userId,
      xp: 0,
      gold: ach.rewardGold,
      gems: ach.rewardGems,
      fate: ach.rewardFate,
      source: "bonus",
      sourceId: ach.id,
    });
  }

  return NextResponse.json({
    unlocked: true,
    reward: { gold: ach.rewardGold, gems: ach.rewardGems, fate: ach.rewardFate },
  });
}
