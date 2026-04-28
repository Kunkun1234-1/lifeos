import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";

type Params = { params: Promise<{ id: string }> };

/**
 * Redeem a reward — deducts cost from currency and records a redemption.
 * Atomic via transaction; refuses if user can't afford.
 */
export async function POST(_req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;

  const reward = await prisma.rewardItem.findFirst({ where: { id, userId, archived: false } });
  if (!reward) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const currency = await prisma.currency.findUnique({ where: { userId } });
  if (!currency) return NextResponse.json({ error: "No currency" }, { status: 400 });

  if (currency.gold < reward.costGold || currency.gems < reward.costGems) {
    return NextResponse.json(
      {
        error: "Insufficient currency",
        need: { gold: reward.costGold, gems: reward.costGems },
        have: { gold: currency.gold, gems: currency.gems },
      },
      { status: 400 }
    );
  }

  const [updatedCurrency, redemption, updatedReward] = await prisma.$transaction([
    prisma.currency.update({
      where: { userId },
      data: {
        gold: { decrement: reward.costGold },
        gems: { decrement: reward.costGems },
      },
    }),
    prisma.rewardRedemption.create({
      data: {
        userId,
        rewardId: id,
        costGold: reward.costGold,
        costGems: reward.costGems,
        source: "store",
      },
    }),
    prisma.rewardItem.update({
      where: { id },
      data: { redeemedCount: { increment: 1 } },
    }),
  ]);

  return NextResponse.json({
    redemption,
    reward: updatedReward,
    currency: updatedCurrency,
  });
}
