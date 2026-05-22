import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { GachaPullSchema } from "@/lib/validators";

/**
 * Gacha pull — limited-banner style wish rules with original rewards.
 * Cost: 1 Fate per pull, 10 Fate for 10x.
 * Base rates (no pity):
 *   Common / 3-star       94.3%
 *   Rare+Epic / 4-star     5.1%
 *   Legendary / 5-star     0.6%
 * Pity:
 *   10 pulls since last 4-star+ → guaranteed 4-star or above
 *   74 pulls since last 5-star → rising 5-star rate
 *   90 pulls since last 5-star → guaranteed 5-star
 * Pool selection: weighted random within tier, restricted to user's
 * RewardItems where inGachaPool=true.
 *
 * Each pull is recorded in GachaPull. The reward, if any, is materialized
 * as a RewardRedemption (source="gacha") so the user "owns" the prize.
 */

const FOUR_STAR_RATE = 0.051;
const FIVE_STAR_RATE = 0.006;
const FOUR_STAR_PITY = 10;
const FIVE_STAR_SOFT_PITY = 74;
const FIVE_STAR_HARD_PITY = 90;

type Tier = "common" | "rare" | "epic" | "legendary";

function rollFourStarTier(): Tier {
  return Math.random() < 0.18 ? "epic" : "rare";
}

function currentFiveStarRate(pullsSinceFiveStar: number): number {
  const nextPull = pullsSinceFiveStar + 1;
  if (nextPull >= FIVE_STAR_HARD_PITY) return 1;
  if (nextPull < FIVE_STAR_SOFT_PITY) return FIVE_STAR_RATE;
  return Math.min(1, FIVE_STAR_RATE + (nextPull - FIVE_STAR_SOFT_PITY + 1) * 0.06);
}

function rollTier(pullsSinceFourStar: number, pullsSinceFiveStar: number): Tier {
  if (Math.random() < currentFiveStarRate(pullsSinceFiveStar)) {
    return "legendary";
  }

  if (pullsSinceFourStar + 1 >= FOUR_STAR_PITY) {
    return rollFourStarTier();
  }

  if (Math.random() < FOUR_STAR_RATE) return rollFourStarTier();
  return "common";
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  const body = await req.json().catch(() => ({}));
  const { count } = GachaPullSchema.parse(body);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const currency = await prisma.currency.findUnique({ where: { userId } });
  if (!user || !currency) return NextResponse.json({ error: "User missing" }, { status: 404 });

  if (currency.fate < count) {
    return NextResponse.json(
      {
        error: "Insufficient fate tokens",
        need: count,
        have: currency.fate,
      },
      { status: 400 }
    );
  }

  // Load gacha pool grouped by tier
  const poolItems = await prisma.rewardItem.findMany({
    where: { userId, inGachaPool: true, archived: false },
  });
  const poolByTier: Record<Tier, typeof poolItems> = {
    common: poolItems.filter((p) => p.tier === "common"),
    rare: poolItems.filter((p) => p.tier === "rare"),
    epic: poolItems.filter((p) => p.tier === "epic"),
    legendary: poolItems.filter((p) => p.tier === "legendary"),
  };

  const fallbackByTier: Record<Tier, Tier[]> = {
    common: ["common", "rare", "epic", "legendary"],
    rare: ["rare", "epic", "common", "legendary"],
    epic: ["epic", "rare", "common", "legendary"],
    legendary: ["legendary", "epic", "rare", "common"],
  };

  function pickFromTier(tier: Tier): (typeof poolItems)[number] | null {
    let items = poolByTier[tier];
    if (items.length === 0) {
      for (const fallbackTier of fallbackByTier[tier]) {
        const fb = poolByTier[fallbackTier];
        if (fb.length) {
          items = fb;
          break;
        }
      }
    }
    if (items.length === 0) return null;
    const totalWeight = items.reduce((s, it) => s + Math.max(1, it.weight), 0);
    let r = Math.random() * totalWeight;
    for (const it of items) {
      r -= Math.max(1, it.weight);
      if (r <= 0) return it;
    }
    return items[items.length - 1];
  }

  let pullsSinceRare = user.pullsSinceRare;
  let pullsSinceEpic = user.pullsSinceEpic;
  const totalPullsBase = user.totalPulls;

  const results: Array<{
    pullId: string;
    tier: Tier;
    reward: (typeof poolItems)[number] | null;
    pity: "soft" | "hard" | null;
  }> = [];

  for (let i = 0; i < count; i++) {
    const beforeSinceRare = pullsSinceRare;
    const beforeSinceEpic = pullsSinceEpic;
    const tier = rollTier(beforeSinceRare, beforeSinceEpic);
    const reward = pickFromTier(tier);

    let pity: "soft" | "hard" | null = null;
    if (tier === "legendary" && beforeSinceEpic + 1 >= FIVE_STAR_HARD_PITY) {
      pity = "hard";
    } else if (
      tier === "legendary" &&
      beforeSinceEpic + 1 >= FIVE_STAR_SOFT_PITY
    ) {
      pity = "soft";
    } else if (tier !== "common" && beforeSinceRare + 1 >= FOUR_STAR_PITY) {
      pity = "soft";
    }

    // Update counters
    if (tier === "common") {
      pullsSinceRare += 1;
      pullsSinceEpic += 1;
    } else if (tier === "rare" || tier === "epic") {
      pullsSinceRare = 0;
      pullsSinceEpic += 1;
    } else {
      // legendary
      pullsSinceRare = 0;
      pullsSinceEpic = 0;
    }

    const pull = await prisma.gachaPull.create({
      data: {
        userId,
        rewardId: reward?.id ?? null,
        tier,
        fateSpent: 1,
        pity,
      },
    });

    // Record as redemption (so user "owns" the reward)
    if (reward) {
      await prisma.$transaction([
        prisma.rewardRedemption.create({
          data: {
            userId,
            rewardId: reward.id,
            costGold: 0,
            costGems: 0,
            source: "gacha",
          },
        }),
        prisma.rewardItem.update({
          where: { id: reward.id },
          data: { redeemedCount: { increment: 1 } },
        }),
      ]);
    }

    results.push({ pullId: pull.id, tier, reward, pity });
  }

  // Persist counters + currency
  const [updatedUser, updatedCurrency] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        pullsSinceRare,
        pullsSinceEpic,
        totalPulls: totalPullsBase + count,
      },
    }),
    prisma.currency.update({
      where: { userId },
      data: { fate: { decrement: count } },
    }),
  ]);

  return NextResponse.json({
    results,
    fateRemaining: updatedCurrency.fate,
    pullsSinceRare: updatedUser.pullsSinceRare,
    pullsSinceEpic: updatedUser.pullsSinceEpic,
    totalPulls: updatedUser.totalPulls,
  });
}
