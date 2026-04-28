import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";

export async function GET() {
  const userId = await getCurrentUserId();
  const [titles, unlocks, user] = await Promise.all([
    prisma.title.findMany({ orderBy: [{ tier: "asc" }, { name: "asc" }] }),
    prisma.userTitle.findMany({ where: { userId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { equippedTitleKey: true },
    }),
  ]);
  const unlockMap = new Map(unlocks.map((u) => [u.titleKey, u.unlockedAt]));
  const equippedKey = user?.equippedTitleKey ?? null;

  // Pull achievement progress to show "解锁条件" hints on locked titles.
  // Cheap join — list every distinct sourceAchievementKey involved.
  const achKeys = [...new Set(titles.map((t) => t.sourceAchievementKey))];
  const achievements = await prisma.achievement.findMany({
    where: { key: { in: achKeys } },
    select: { key: true, name: true, emoji: true, tier: true, trigger: true },
  });
  const achMap = new Map(achievements.map((a) => [a.key, a]));

  const items = titles.map((t) => {
    const unlockedAt = unlockMap.get(t.key) ?? null;
    const ach = achMap.get(t.sourceAchievementKey) ?? null;
    return {
      key: t.key,
      name: t.name,
      description: t.description,
      emoji: t.emoji,
      tier: t.tier as "bronze" | "silver" | "gold" | "legendary",
      sourceAchievement: ach
        ? { key: ach.key, name: ach.name, emoji: ach.emoji, tier: ach.tier, trigger: ach.trigger }
        : { key: t.sourceAchievementKey, name: t.sourceAchievementKey, emoji: "🏆", tier: "bronze", trigger: "" },
      unlocked: !!unlockedAt,
      unlockedAt: unlockedAt ? unlockedAt.toISOString() : null,
      equipped: equippedKey === t.key,
    };
  });

  return NextResponse.json({
    items,
    equippedKey,
    unlockedCount: unlocks.length,
    totalCount: titles.length,
  });
}
