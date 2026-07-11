import { Prisma, type PrismaClient } from "@prisma/client";
import { grantReward } from "./rewards";

export type UnlockResult = {
  id: string;
  key: string;
  name: string;
  emoji: string;
  tier: string;
  rewardGold: number;
  rewardGems: number;
  rewardFate: number;
};

export async function checkAchievements(
  db: PrismaClient,
  userId: string,
): Promise<UnlockResult[]> {
  const [definitions, existing] = await Promise.all([
    db.achievement.findMany({
      where: { OR: [{ ownerUserId: null }, { ownerUserId: userId }] },
    }),
    db.achievementUnlock.findMany({
      where: { userId },
      select: { achievementId: true },
    }),
  ]);
  const unlocked = new Set(existing.map((item) => item.achievementId));

  const [taskDoneCount, totalXp] = await Promise.all([
    db.task.count({ where: { userId, status: "DONE" } }),
    db.xpLedger
      .aggregate({ where: { userId }, _sum: { amount: true } })
      .then((row) => Math.max(0, row._sum.amount ?? 0)),
  ]);
  const metrics: Record<string, number> = {
    task_done_count: taskDoneCount,
    total_xp: totalXp,
    level: deriveLevel(totalXp),
  };

  const results: UnlockResult[] = [];
  for (const definition of definitions) {
    if (unlocked.has(definition.id)) continue;
    const [metric, thresholdRaw] = definition.trigger.split(":");
    const threshold = Number(thresholdRaw);
    if (!metric || Number.isNaN(threshold) || metrics[metric] === undefined) continue;
    if (metrics[metric] < threshold) continue;

    try {
      await db.achievementUnlock.create({
        data: { userId, achievementId: definition.id },
      });
      if (definition.rewardGold + definition.rewardGems + definition.rewardFate > 0) {
        await grantReward(db, {
          userId,
          xp: 0,
          gold: definition.rewardGold,
          gems: definition.rewardGems,
          fate: definition.rewardFate,
          source: "bonus",
          sourceId: definition.id,
        });
      }
      await unlockAchievementCollections(db, userId, definition.key);
      results.push({
        id: definition.id,
        key: definition.key,
        name: definition.name,
        emoji: definition.emoji,
        tier: definition.tier,
        rewardGold: definition.rewardGold,
        rewardGems: definition.rewardGems,
        rewardFate: definition.rewardFate,
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  return results;
}

export async function safeCheckAchievements(db: PrismaClient, userId: string) {
  try {
    return await checkAchievements(db, userId);
  } catch (error) {
    console.error("[achievements] check failed", error);
    return [];
  }
}

async function unlockAchievementCollections(
  db: PrismaClient,
  userId: string,
  achievementKey: string,
) {
  const [titles, equipment] = await Promise.all([
    db.title.findMany({
      where: { sourceAchievementKey: achievementKey },
      select: { key: true },
    }),
    db.equipment.findMany({
      where: { source: "achievement", sourceKey: achievementKey },
      select: { key: true },
    }),
  ]);
  await Promise.all([
    ...titles.map((title) =>
      db.userTitle.upsert({
        where: { userId_titleKey: { userId, titleKey: title.key } },
        create: { userId, titleKey: title.key },
        update: {},
      }),
    ),
    ...equipment.map((item) =>
      db.userEquipment.upsert({
        where: { userId_equipmentKey: { userId, equipmentKey: item.key } },
        create: { userId, equipmentKey: item.key },
        update: {},
      }),
    ),
  ]);
}

function deriveLevel(totalXp: number) {
  let level = 1;
  let remaining = Math.max(0, totalXp);
  let needed = Math.floor(100 * Math.pow(level, 1.5));
  while (remaining >= needed) {
    remaining -= needed;
    level += 1;
    needed = Math.floor(100 * Math.pow(level, 1.5));
  }
  return level;
}

function isUniqueViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}
