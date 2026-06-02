import { NextResponse } from "next/server";
import { z } from "zod";
import { serializeInventoryReward } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";

type Params = { params: Promise<{ id: string }> };

const Body = z.object({
  action: z.enum(["use", "discard"]),
  note: z.string().max(500).optional().nullable(),
});

export async function PATCH(req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const raw = await req.json().catch(() => null);
  const parsed = Body.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.rewardRedemption.findFirst({
    where: { id, userId },
    select: { id: true, status: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.status !== "available") {
    return NextResponse.json(
      { error: "Only available rewards can be updated" },
      { status: 409 },
    );
  }

  const now = new Date();
  const note = parsed.data.note?.trim() || null;
  const update =
    parsed.data.action === "use"
      ? { status: "used", usedAt: now, note }
      : { status: "discarded", discardedAt: now, note };

  const updated = await prisma.rewardRedemption.update({
    where: { id },
    data: update,
    include: { reward: true },
  });

  return NextResponse.json(serializeInventoryReward(updated));
}
