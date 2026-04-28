import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { GachaPullSchema } from "@/lib/validators";

/**
 * Gacha pull — per design doc §4.5.
 * Cost: 1 Fate per pull, 10 Fate for 10x.
 * Base rates (no pity):
 *   Common      72%
 *   Rare        22%
 *   Epic         5%
 *   Legendary    1%
 * Pity:
 *   Soft pity at 30 since last Rare+ → guaranteed Rare or above
 *   Hard pity at 80 since last Epic+ → guaranteed Epic or above
 * Pool selection: weighted random within tier, restricted to user's
 * RewardItems where inGachaPool=true.
 *
 * Each pull is recorded in GachaPull. The reward, if any, is materialized
 * as a RewardRedemption (source="gacha") so the user "owns" the prize.
 */

const SOFT_PITY = 30;
const HARD_PITY = 80;

type Tier = "common" | "rare" | "epic" | "legendary";

function rollTier(pullsSinceRare: number, pullsSinceEpic: number): Tier {
  // Hard pity: epic+ guaranteed
  if (pullsSinceEpic + 1 >= HARD_PITY) {
    const r = Math.random();
    return r < 0.85 ? "epic" : "legendary";
  }
  // Soft pity: rare+ guaranteed
  if (pullsSinceRare + 1 >= SOFT_PITY) {
    const r = Math.random();
    if (r < 0.85) return "rare";
    if (r < 0.98) return "epic";
    return "legendary";
  }
  const r = Math.random();
  if (r < 0.72) return "common";
  if (r < 0.94) return "rare";
  if (r < 0.99) return "epic";
  return "legendary";
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

  // Fallback: if a tier is empty, downgrade to next available tier
  const fallbackOrder: Tier[] = ["legendary", "epic", "rare", "common"];

  function pickFromTier(tier: Tier): (typeof poolItems)[number] | null {
    let items = poolByTier[tier];
    if (items.length === 0) {
      const idx = fallbackOrder.indexOf(tier);
      for (let i = idx + 1; i < fallbackOrder.length; i++) {
        const fb = poolByTier[fallbackOrder[i]];
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
    if (beforeSinceEpic + 1 >= HARD_PITY) pity = "hard";
    else if (beforeSinceRare + 1 >= SOFT_PITY) pity = "soft";

    // Update counters
    if (tier === "common") {
      pullsSinceRare += 1;
      pullsSinceEpic += 1;
    } else if (tier === "rare") {
      pullsSinceRare = 0;
      pullsSinceEpic += 1;
    } else {
      // epic / legendary
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
