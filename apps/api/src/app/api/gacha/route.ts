import { NextResponse } from "next/server";
import {
  FIVE_STAR_HARD_PITY,
  FIVE_STAR_SOFT_PITY,
  FOUR_STAR_PITY,
  GACHA_RULES_VERSION,
  GACHA_TIERS,
  GOLD_PER_PULL,
} from "@/lib/gacha-rules";
import { normalizeGachaImageUrl } from "@/lib/gacha-assets";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";

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
  const missingTiers = GACHA_TIERS.filter(
    (tier) => !poolItems.some((item) => item.tier === tier),
  );
  const serializeReward = (item: (typeof rewardItems)[number]) => ({
    ...item,
    imageUrl: normalizeGachaImageUrl(item.imageUrl),
  });

  return NextResponse.json({
    gold: currency?.gold ?? 0,
    pullsSinceRare: user?.pullsSinceRare ?? 0,
    pullsSinceEpic: user?.pullsSinceEpic ?? 0,
    totalPulls: user?.totalPulls ?? 0,
    recent: recent.map((pull) => ({
      ...pull,
      reward: pull.reward ? serializeReward(pull.reward) : null,
    })),
    pool: poolItems.map(serializeReward),
    rewards: rewardItems.map(serializeReward),
    goldPerPull: GOLD_PER_PULL,
    rulesVersion: GACHA_RULES_VERSION,
    ready: missingTiers.length === 0,
    missingTiers,
    fourStarPityAt: FOUR_STAR_PITY,
    softPityAt: FIVE_STAR_SOFT_PITY,
    hardPityAt: FIVE_STAR_HARD_PITY,
  });
}
