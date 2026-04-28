import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";

/**
 * Gacha state — recent pulls, pity counters, available pool by tier.
 */
export async function GET() {
  const userId = await getCurrentUserId();
  const [user, currency, recent, poolItems] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.currency.findUnique({ where: { userId } }),
    prisma.gachaPull.findMany({
      where: { userId },
      include: { reward: true },
      orderBy: { pulledAt: "desc" },
      take: 30,
    }),
    prisma.rewardItem.findMany({
      where: { userId, inGachaPool: true, archived: false },
      orderBy: [{ tier: "asc" }, { name: "asc" }],
    }),
  ]);

  return NextResponse.json({
    fate: currency?.fate ?? 0,
    pullsSinceRare: user?.pullsSinceRare ?? 0,
    pullsSinceEpic: user?.pullsSinceEpic ?? 0,
    totalPulls: user?.totalPulls ?? 0,
    recent,
    pool: poolItems,
    softPityAt: 30,
    hardPityAt: 80,
  });
}
