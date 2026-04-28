import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { RewardItemUpdateSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const body = await req.json();
  const data = RewardItemUpdateSchema.parse(body);

  const existing = await prisma.rewardItem.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = await prisma.rewardItem.update({ where: { id }, data });
  return NextResponse.json(updated);
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
