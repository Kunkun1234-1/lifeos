import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { RewardItemSchema } from "@/lib/validators";
import { normalizeGachaImageUrl } from "@/lib/gacha-assets";

export async function GET() {
  const userId = await getCurrentUserId();
  const items = await prisma.rewardItem.findMany({
    where: { userId, archived: false },
    orderBy: [{ category: "asc" }, { costMoneyCents: "asc" }, { costGold: "asc" }],
  });
  return NextResponse.json(items.map((item) => ({ ...item, imageUrl: normalizeGachaImageUrl(item.imageUrl) })));
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  const body = await req.json();
  const data = RewardItemSchema.parse(body);
  const item = await prisma.rewardItem.create({
    data: { ...data, userId },
  });
  return NextResponse.json(item, { status: 201 });
}
