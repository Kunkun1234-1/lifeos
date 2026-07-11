import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { RewardItemSchema, RewardItemUpdateSchema } from "@/lib/validators";
import { normalizeGachaImageUrl } from "@/lib/gacha-assets";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const body = await req.json();
  const patch = RewardItemUpdateSchema.parse(body);

  const existing = await prisma.rewardItem.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const data = RewardItemSchema.parse({
    name: existing.name,
    description: existing.description,
    emoji: existing.emoji,
    imageUrl: existing.imageUrl,
    tier: existing.tier,
    category: existing.category,
    costMoneyCents: existing.costMoneyCents,
    costGold: existing.costGold,
    inGachaPool: existing.inGachaPool,
    weight: existing.weight,
    ...patch,
  });
  const updated = await prisma.rewardItem.update({ where: { id }, data });
  return NextResponse.json({ ...updated, imageUrl: normalizeGachaImageUrl(updated.imageUrl) });
}

export async function DELETE(_req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  await prisma.rewardItem.updateMany({
    where: { id, userId },
    data: { archived: true },
  });
  return NextResponse.json({ ok: true });
}
