import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { normalizeGachaImageUrl } from "@/lib/gacha-assets";

const GOLD_PER_PULL = 160;

/**
 * Gacha state — recent pulls, pity counters, available pool by tier.
 */
export async function GET() {
  const userId = await getCurrentUserId();
  const [user, currency, recent, rewardItems] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.currency.findUnique({ where: { userId } }),
    prisma.gachaPull.findMany({
      where: { userId },
      include: { reward: true },
      orderBy: { pulledAt: "desc" },
      take: 30,
    }),
    prisma.rewardItem.findMany({
      where: { userId, archived: false },
      orderBy: [{ tier: "asc" }, { name: "asc" }],
    }),
  ]);
  const poolItems = rewardItems.filter((item) => item.inGachaPool);
  const serializeReward = (item: (typeof rewardItems)[number]) => ({
    ...item,
    imageUrl: normalizeGachaImageUrl(item.imageUrl),
  });

  return NextResponse.json({
    gold: currency?.gold ?? 0,
    fate: currency?.fate ?? 0,
    pullsSinceRare: user?.pullsSinceRare ?? 0,
    pullsSinceEpic: user?.pullsSinceEpic ?? 0,
    totalPulls: user?.totalPulls ?? 0,
    recent: recent.map((pull) => ({
      ...pull,
      reward: pull.reward ? { ...pull.reward, imageUrl: normalizeGachaImageUrl(pull.reward.imageUrl) } : null,
    })),
    pool: poolItems.map(serializeReward),
    rewards: rewardItems.map(serializeReward),
    goldPerPull: GOLD_PER_PULL,
    fourStarPityAt: 10,
    softPityAt: 74,
    hardPityAt: 90,
  });
}
