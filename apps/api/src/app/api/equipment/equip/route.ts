import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";

// Mirror the title-equip pattern: explicit null to unequip; empty/missing rejected.
const Schema = z.object({
  key: z.union([z.string().min(1).max(80), z.null()]),
});

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  const raw = await req.json().catch(() => null);
  if (raw === null || typeof raw !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const key = parsed.data.key ? parsed.data.key.trim() || null : null;

  if (key) {
    const owned = await prisma.userEquipment.findUnique({
      where: { userId_equipmentKey: { userId, equipmentKey: key } },
      select: { equipmentKey: true },
    });
    if (!owned) {
      return NextResponse.json(
        { error: "You haven't unlocked that frame yet" },
        { status: 403 }
      );
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { equippedFrameKey: key },
  });

  return NextResponse.json({ ok: true, equippedKey: key });
}
