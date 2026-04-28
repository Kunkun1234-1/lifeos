import { prisma } from "./prisma";
import { resolveAreaKey } from "./gamification";
import type { Prisma } from "@prisma/client";

type RewardSource = "task" | "habit" | "routine" | "commission" | "review" | "bonus";

export type GrantRewardInput = {
  userId: string;
  xp: number;
  gold?: number;
  gems?: number;
  fate?: number;
  source: RewardSource;
  sourceId?: string | null;
  areaId?: string | null;
};

/**
 * Atomically grant XP + currency for a completion.
 * Returns the updated totals so the caller can feed the animation layer.
 */
export async function grantReward(input: GrantRewardInput) {
  const { userId, source, sourceId = null, areaId = null } = input;
  const xp = Math.max(0, Math.floor(input.xp));
  const gold = Math.max(0, Math.floor(input.gold ?? 0));
  const gems = Math.max(0, Math.floor(input.gems ?? 0));
  const fate = Math.max(0, Math.floor(input.fate ?? 0));

  // Resolve attribute key from area (if any).
  let areaKey: string | null = null;
  if (areaId) {
    const area = await prisma.area.findUnique({ where: { id: areaId } });
    areaKey = resolveAreaKey(area?.attributeKey);
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (xp > 0) {
      await tx.xpLedger.create({
        data: { userId, amount: xp, source, sourceId, areaKey },
      });
      if (areaId) {
        await tx.area.update({
          where: { id: areaId },
          data: { attributeXp: { increment: xp } },
        });
      }
    }

    const currency = await tx.currency.upsert({
      where: { userId },
      create: { userId, gold, gems, fate },
      update: {
        gold: { increment: gold },
        gems: { increment: gems },
        fate: { increment: fate },
      },
    });

    return {
      xpGranted: xp,
      goldGranted: gold,
      gemsGranted: gems,
      fateGranted: fate,
      areaKey,
      currency,
    };
  });
}

/** Subtract currency/XP (used for negative-habit ticks). Won't take values below 0. */
export async function deductReward(input: GrantRewardInput) {
  const { userId, source, sourceId = null, areaId = null } = input;
  const xp = Math.max(0, Math.floor(input.xp));
  const gold = Math.max(0, Math.floor(input.gold ?? 0));

  let areaKey: string | null = null;
  if (areaId) {
    const area = await prisma.area.findUnique({ where: { id: areaId } });
    areaKey = resolveAreaKey(area?.attributeKey);
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (xp > 0) {
      await tx.xpLedger.create({
        data: { userId, amount: -xp, source, sourceId, areaKey },
      });
      if (areaId) {
        const area = await tx.area.findUnique({ where: { id: areaId } });
        const nextAttr = Math.max(0, (area?.attributeXp ?? 0) - xp);
        await tx.area.update({
          where: { id: areaId },
          data: { attributeXp: nextAttr },
        });
      }
    }

    const existing = await tx.currency.findUnique({ where: { userId } });
    const nextGold = Math.max(0, (existing?.gold ?? 0) - gold);
    const currency = await tx.currency.upsert({
      where: { userId },
      create: { userId, gold: 0 },
      update: { gold: nextGold },
    });

    return { currency };
  });
}

/** Sum XpLedger and derive {totalXp, byArea}. Snapshot for the header. */
export async function getUserXpSnapshot(userId: string) {
  const entries = await prisma.xpLedger.findMany({
    where: { userId },
    select: { amount: true, areaKey: true },
  });
  let totalXp = 0;
  const byArea: Record<string, number> = {};
  for (const e of entries) {
    totalXp += e.amount;
    if (e.areaKey) byArea[e.areaKey] = (byArea[e.areaKey] ?? 0) + e.amount;
  }
  return { totalXp: Math.max(0, totalXp), byArea };
}
