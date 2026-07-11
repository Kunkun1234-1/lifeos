import type { Prisma, PrismaClient } from "@prisma/client";

type RewardSource =
  | "task"
  | "habit"
  | "routine"
  | "commission"
  | "review"
  | "bonus";

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

export async function grantReward(
  db: PrismaClient,
  input: GrantRewardInput,
) {
  return db.$transaction((tx) => grantRewardInTransaction(tx, input));
}

export async function grantRewardInTransaction(
  tx: Prisma.TransactionClient,
  input: GrantRewardInput,
) {
  const { userId, source, sourceId = null, areaId = null } = input;
  const xp = Math.max(0, Math.floor(input.xp));
  const gold = Math.max(0, Math.floor(input.gold ?? 0));
  const gems = Math.max(0, Math.floor(input.gems ?? 0));
  const fate = Math.max(0, Math.floor(input.fate ?? 0));

  const area = areaId
    ? await tx.area.findFirst({
        where: { id: areaId, userId },
        select: { id: true, attributeKey: true },
      })
    : null;
  const areaKey = resolveAreaKey(area?.attributeKey);

  if (xp > 0) {
    await tx.xpLedger.create({
      data: { userId, amount: xp, source, sourceId, areaKey },
    });
    if (area) {
      await tx.area.update({
        where: { id: area.id },
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
}

const ATTRIBUTE_KEYS = new Set(["STR", "INT", "CHA", "WIS", "CRE", "GOLD"]);

function resolveAreaKey(raw: string | null | undefined): string | null {
  return raw && ATTRIBUTE_KEYS.has(raw) ? raw : null;
}
