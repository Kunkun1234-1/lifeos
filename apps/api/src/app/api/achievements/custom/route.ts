import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { CustomAchievementCreateSchema } from "@/lib/validators";

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  const body = await req.json();
  const data = CustomAchievementCreateSchema.parse(body);

  const cuid = await prisma.achievement
    .create({
      data: {
        // Custom key prefixed with `u:` + a server timestamp segment to avoid
        // collisions with system seeds.
        key: `u:${userId.slice(-6)}:${Date.now().toString(36)}`,
        name: data.name,
        description: data.description,
        emoji: data.emoji,
        imageUrl: data.imageUrl ?? null,
        tier: data.tier,
        category: "custom",
        // Custom achievements are manually unlocked.
        trigger: "manual",
        rewardGold: data.rewardGold,
        rewardGems: data.rewardGems,
        rewardFate: data.rewardFate,
        ownerUserId: userId,
      },
      select: { id: true },
    });

  return NextResponse.json({ id: cuid.id });
}
