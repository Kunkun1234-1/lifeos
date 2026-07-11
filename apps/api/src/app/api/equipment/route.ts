import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { parseFrameStyle } from "@/lib/equipment";

export async function GET() {
  const userId = await getCurrentUserId();
  const [equipment, owned, user] = await Promise.all([
    prisma.equipment.findMany({ orderBy: [{ tier: "asc" }, { name: "asc" }] }),
    prisma.userEquipment.findMany({ where: { userId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { equippedFrameKey: true },
    }),
  ]);
  const ownedMap = new Map(owned.map((u) => [u.equipmentKey, u.unlockedAt]));
  const equippedKey = user?.equippedFrameKey ?? null;

  // Pull source achievement metadata for hint chips on locked items
  const achKeys = [
    ...new Set(equipment.filter((e) => e.source === "achievement" && e.sourceKey).map((e) => e.sourceKey as string)),
  ];
  const achievements = await prisma.achievement.findMany({
    where: { key: { in: achKeys } },
    select: { key: true, name: true, emoji: true, tier: true, trigger: true },
  });
  const achMap = new Map(achievements.map((a) => [a.key, a]));

  const items = equipment.map((e) => {
    const unlockedAt = ownedMap.get(e.key) ?? null;
    const sourceAch =
      e.source === "achievement" && e.sourceKey ? achMap.get(e.sourceKey) ?? null : null;
    return {
      key: e.key,
      name: e.name,
      description: e.description,
      emoji: e.emoji,
      slot: e.slot,
      tier: e.tier as "common" | "rare" | "epic" | "legendary",
      source: e.source as "seed" | "achievement" | "event" | "gacha",
      sourceKey: e.sourceKey,
      sourceAchievement: sourceAch,
      style: parseFrameStyle(e.style),
      unlocked: !!unlockedAt,
      unlockedAt: unlockedAt ? unlockedAt.toISOString() : null,
      equipped: equippedKey === e.key,
    };
  });

  return NextResponse.json({
    items,
    equippedKey,
    unlockedCount: owned.length,
    totalCount: equipment.length,
  });
}
