import { NextResponse } from "next/server";
import { parseFrameStyle } from "@/lib/equipment";
import { serializeInventoryReward } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";

const FREEZE_COST_GOLD = 50;

function titleTier(value: string) {
  if (value === "silver" || value === "gold" || value === "legendary") return value;
  return "bronze";
}

function equipmentTier(value: string) {
  if (value === "rare" || value === "epic" || value === "legendary") return value;
  return "common";
}

function achievementTier(value: string) {
  if (value === "silver" || value === "gold" || value === "legendary") return value;
  return "bronze";
}

export async function GET() {
  const user = await getCurrentUser();
  const userId = user.id;

  const [
    freezeStash,
    rewardRedemptions,
    allEquipment,
    ownedEquipment,
    allTitles,
    ownedTitles,
    titleSourceAchievements,
    eligibleAchievementCount,
    achievementUnlocks,
  ] = await Promise.all([
    prisma.streakFreeze.findUnique({ where: { userId } }),
    prisma.rewardRedemption.findMany({
      where: { userId },
      include: { reward: true },
      orderBy: { redeemedAt: "desc" },
    }),
    prisma.equipment.findMany({ orderBy: [{ tier: "asc" }, { name: "asc" }] }),
    prisma.userEquipment.findMany({ where: { userId } }),
    prisma.title.findMany({ orderBy: [{ tier: "asc" }, { name: "asc" }] }),
    prisma.userTitle.findMany({ where: { userId } }),
    prisma.achievement.findMany({
      select: { key: true, name: true, emoji: true, tier: true, trigger: true },
    }),
    prisma.achievement.count({
      where: { OR: [{ ownerUserId: null }, { ownerUserId: userId }] },
    }),
    prisma.achievementUnlock.findMany({
      where: {
        userId,
        achievement: { OR: [{ ownerUserId: null }, { ownerUserId: userId }] },
      },
      include: { achievement: true },
      orderBy: { unlockedAt: "desc" },
    }),
  ]);

  const ownedEquipmentMap = new Map(
    ownedEquipment.map((item) => [item.equipmentKey, item.unlockedAt]),
  );
  const titleUnlockMap = new Map(ownedTitles.map((item) => [item.titleKey, item.unlockedAt]));
  const sourceAchievementMap = new Map(
    titleSourceAchievements.map((achievement) => [achievement.key, achievement]),
  );

  const equipment = allEquipment
    .map((item) => {
      const unlockedAt = ownedEquipmentMap.get(item.key) ?? null;
      const sourceAchievement =
        item.source === "achievement" && item.sourceKey
          ? sourceAchievementMap.get(item.sourceKey) ?? null
          : null;
      return {
        key: item.key,
        name: item.name,
        description: item.description,
        emoji: item.emoji,
        slot: item.slot,
        tier: equipmentTier(item.tier),
        source:
          item.source === "achievement" ||
          item.source === "event" ||
          item.source === "gacha"
            ? item.source
            : "seed",
        sourceKey: item.sourceKey,
        sourceAchievement,
        style: parseFrameStyle(item.style),
        unlocked: !!unlockedAt,
        unlockedAt: unlockedAt ? unlockedAt.toISOString() : null,
        equipped: user.equippedFrameKey === item.key,
      };
    })
    .filter((item) => item.unlocked);

  const titles = allTitles
    .map((item) => {
      const unlockedAt = titleUnlockMap.get(item.key) ?? null;
      const sourceAchievement = sourceAchievementMap.get(item.sourceAchievementKey);
      return {
        key: item.key,
        name: item.name,
        description: item.description,
        emoji: item.emoji,
        tier: titleTier(item.tier),
        sourceAchievement: sourceAchievement
          ? {
              key: sourceAchievement.key,
              name: sourceAchievement.name,
              emoji: sourceAchievement.emoji,
              tier: sourceAchievement.tier,
              trigger: sourceAchievement.trigger,
            }
          : {
              key: item.sourceAchievementKey,
              name: item.sourceAchievementKey,
              emoji: "🏆",
              tier: "bronze",
              trigger: "",
            },
        unlocked: !!unlockedAt,
        unlockedAt: unlockedAt ? unlockedAt.toISOString() : null,
        equipped: user.equippedTitleKey === item.key,
      };
    })
    .filter((item) => item.unlocked);

  return NextResponse.json({
    currency: {
      gold: user.currency?.gold ?? 0,
      gems: user.currency?.gems ?? 0,
      fate: user.currency?.fate ?? 0,
    },
    freeze: {
      count: freezeStash?.count ?? 0,
      totalUsed: freezeStash?.totalUsed ?? 0,
      costGold: FREEZE_COST_GOLD,
    },
    rewards: rewardRedemptions.map(serializeInventoryReward),
    equipment: {
      items: equipment,
      equippedKey: user.equippedFrameKey,
      unlockedCount: ownedEquipment.length,
      totalCount: allEquipment.length,
    },
    titles: {
      items: titles,
      equippedKey: user.equippedTitleKey,
      unlockedCount: ownedTitles.length,
      totalCount: allTitles.length,
    },
    achievements: {
      items: achievementUnlocks.map((unlock) => ({
        id: unlock.achievement.id,
        key: unlock.achievement.key,
        name: unlock.achievement.name,
        description: unlock.achievement.description,
        emoji: unlock.achievement.emoji,
        imageUrl: unlock.achievement.imageUrl,
        tier: achievementTier(unlock.achievement.tier),
        category: unlock.achievement.category,
        isCustom: !!unlock.achievement.ownerUserId,
        unlockedAt: unlock.unlockedAt.toISOString(),
        reward: {
          gold: unlock.achievement.rewardGold,
          gems: unlock.achievement.rewardGems,
          fate: unlock.achievement.rewardFate,
        },
      })),
      unlockedCount: achievementUnlocks.length,
      totalCount: eligibleAchievementCount,
    },
  });
}
