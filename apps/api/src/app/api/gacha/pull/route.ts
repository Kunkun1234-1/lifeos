import { Prisma, type RewardItem } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  currentFiveStarRate,
  FIVE_STAR_HARD_PITY,
  FIVE_STAR_SOFT_PITY,
  FOUR_STAR_PITY,
  FOUR_STAR_RATE,
  GACHA_RULES_VERSION,
  GACHA_TIERS,
  GOLD_PER_PULL,
  rollGachaTier,
  type GachaTier,
} from "@/lib/gacha-rules";
import { normalizeGachaImageUrl } from "@/lib/gacha-assets";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { GachaPullSchema } from "@/lib/validators";

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  const { count } = GachaPullSchema.parse(await req.json().catch(() => ({})));
  const idempotencyKey =
    req.headers.get("Idempotency-Key")?.trim().slice(0, 120) || crypto.randomUUID();

  const existing = await prisma.gachaPullBatch.findUnique({
    where: { userId_idempotencyKey: { userId, idempotencyKey } },
  });
  if (existing) return batchResponse(userId, existing.id);

  try {
    const batchId = await prisma.$transaction(async (tx) => {
      const goldCost = count * GOLD_PER_PULL;
      const goldUpdate = await tx.currency.updateMany({
        where: { userId, gold: { gte: goldCost } },
        data: { gold: { decrement: goldCost } },
      });
      if (goldUpdate.count !== 1) throw new WishRuleError("gold 余额不足");

      const [user, poolItems] = await Promise.all([
        tx.user.findUnique({ where: { id: userId } }),
        tx.rewardItem.findMany({
          where: { userId, inGachaPool: true, archived: false },
        }),
      ]);
      if (!user) throw new WishRuleError("用户不存在", 404);

      const poolByTier = groupPoolByTier(poolItems);
      const missingTiers = GACHA_TIERS.filter((tier) => poolByTier[tier].length === 0);
      if (missingTiers.length > 0) {
        throw new WishRuleError(`奖池配置不完整：${missingTiers.join(", ")}`, 409);
      }

      const batch = await tx.gachaPullBatch.create({
        data: {
          userId,
          idempotencyKey,
          count,
          goldSpent: goldCost,
          rulesVersion: GACHA_RULES_VERSION,
        },
      });

      let pullsSinceRare = user.pullsSinceRare;
      let pullsSinceEpic = user.pullsSinceEpic;

      for (let index = 0; index < count; index += 1) {
        const beforeSinceRare = pullsSinceRare;
        const beforeSinceEpic = pullsSinceEpic;
        const tier = rollGachaTier(beforeSinceRare, beforeSinceEpic);
        const reward = pickWeighted(poolByTier[tier]);
        const pity = pityKind(tier, beforeSinceRare, beforeSinceEpic);
        const probabilityBps = probabilityAtPull(tier, beforeSinceRare, beforeSinceEpic);

        if (tier === "common") {
          pullsSinceRare += 1;
          pullsSinceEpic += 1;
        } else if (tier === "rare" || tier === "epic") {
          pullsSinceRare = 0;
          pullsSinceEpic += 1;
        } else {
          pullsSinceRare = 0;
          pullsSinceEpic = 0;
        }

        await tx.gachaPull.create({
          data: {
            userId,
            rewardId: reward.id,
            batchId: batch.id,
            tier,
            fateSpent: 0,
            goldSpent: GOLD_PER_PULL,
            pity,
            rulesVersion: GACHA_RULES_VERSION,
            probabilityBps,
          },
        });

        const immediatelyAvailable =
          reward.category === "virtual" && reward.costMoneyCents === 0;
        await tx.rewardRedemption.create({
          data: {
            userId,
            rewardId: reward.id,
            costMoneyCents: reward.costMoneyCents,
            costGold: GOLD_PER_PULL,
            costGems: 0,
            source: "gacha",
            status: immediatelyAvailable ? "available" : "pending_fulfillment",
            fulfilledAt: immediatelyAvailable ? new Date() : null,
          },
        });
        await tx.rewardItem.update({
          where: { id: reward.id },
          data: { redeemedCount: { increment: 1 } },
        });
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          pullsSinceRare,
          pullsSinceEpic,
          totalPulls: { increment: count },
        },
      });

      return batch.id;
    });

    return batchResponse(userId, batchId);
  } catch (error) {
    if (error instanceof WishRuleError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const duplicate = await prisma.gachaPullBatch.findUnique({
        where: { userId_idempotencyKey: { userId, idempotencyKey } },
      });
      if (duplicate) return batchResponse(userId, duplicate.id);
    }
    throw error;
  }
}

function groupPoolByTier(items: RewardItem[]) {
  const grouped: Record<GachaTier, RewardItem[]> = {
    common: [],
    rare: [],
    epic: [],
    legendary: [],
  };
  for (const item of items) {
    if (GACHA_TIERS.includes(item.tier as GachaTier)) {
      grouped[item.tier as GachaTier].push(item);
    }
  }
  return grouped;
}

function pickWeighted(items: RewardItem[]) {
  const totalWeight = items.reduce((sum, item) => sum + Math.max(1, item.weight), 0);
  let cursor = Math.random() * totalWeight;
  for (const item of items) {
    cursor -= Math.max(1, item.weight);
    if (cursor <= 0) return item;
  }
  return items[items.length - 1];
}

function pityKind(
  tier: GachaTier,
  pullsSinceRare: number,
  pullsSinceEpic: number,
): "soft" | "hard" | null {
  if (tier === "legendary" && pullsSinceEpic + 1 >= FIVE_STAR_HARD_PITY) return "hard";
  if (tier === "legendary" && pullsSinceEpic + 1 >= FIVE_STAR_SOFT_PITY) return "soft";
  if (tier !== "common" && pullsSinceRare + 1 >= FOUR_STAR_PITY) return "soft";
  return null;
}

function probabilityAtPull(
  tier: GachaTier,
  pullsSinceRare: number,
  pullsSinceEpic: number,
) {
  const fiveStarRate = currentFiveStarRate(pullsSinceEpic);
  const fourStarRate =
    pullsSinceRare + 1 >= FOUR_STAR_PITY
      ? 1 - fiveStarRate
      : Math.min(FOUR_STAR_RATE, 1 - fiveStarRate);
  if (tier === "legendary") return Math.round(fiveStarRate * 10_000);
  if (tier === "rare") return Math.round(fourStarRate * 0.82 * 10_000);
  if (tier === "epic") return Math.round(fourStarRate * 0.18 * 10_000);
  return Math.round((1 - fiveStarRate - fourStarRate) * 10_000);
}

async function batchResponse(userId: string, batchId: string) {
  const [batch, pulls, user, currency] = await Promise.all([
    prisma.gachaPullBatch.findFirstOrThrow({ where: { id: batchId, userId } }),
    prisma.gachaPull.findMany({
      where: { batchId, userId },
      include: { reward: true },
      orderBy: { pulledAt: "asc" },
    }),
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.currency.findUnique({ where: { userId } }),
  ]);

  return NextResponse.json({
    batchId: batch.id,
    results: pulls.map((pull) => ({
      pullId: pull.id,
      tier: pull.tier,
      pity: pull.pity,
      reward: pull.reward
        ? { ...pull.reward, imageUrl: normalizeGachaImageUrl(pull.reward.imageUrl, pull.reward.name) }
        : null,
    })),
    goldRemaining: currency?.gold ?? 0,
    goldSpent: batch.goldSpent,
    pullsSinceRare: user.pullsSinceRare,
    pullsSinceEpic: user.pullsSinceEpic,
    totalPulls: user.totalPulls,
  });
}

class WishRuleError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}
