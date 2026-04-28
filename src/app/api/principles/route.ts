import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { PrincipleCreateSchema } from "@/lib/validators";
import { grantReward } from "@/lib/rewards";
import { safeCheck } from "@/lib/achievements";

export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  const url = new URL(req.url);
  const archived = url.searchParams.get("archived") === "1";

  const principles = await prisma.principle.findMany({
    where: { userId, archived },
    orderBy: [{ usageCount: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(principles);
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  const body = await req.json();
  const data = PrincipleCreateSchema.parse(body);

  const principle = await prisma.principle.create({
    data: {
      userId,
      title: data.title,
      body: data.body,
      source: data.source ?? null,
      category: data.category,
      emoji: data.emoji,
    },
  });

  const reward = await grantReward({
    userId,
    xp: 30,
    gold: 15,
    source: "bonus",
    sourceId: principle.id,
  });
  const unlocks = await safeCheck(userId);

  return NextResponse.json({ principle, reward, unlocks }, { status: 201 });
}
