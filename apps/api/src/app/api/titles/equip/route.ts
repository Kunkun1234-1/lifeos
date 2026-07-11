import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";

// `key` is required: pass an explicit `null` to unequip, a string to equip.
// This rejects accidental no-op POSTs (missing body / `{}`) which would
// otherwise silently wipe the user's equipped title.
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
    const owned = await prisma.userTitle.findUnique({
      where: { userId_titleKey: { userId, titleKey: key } },
      select: { titleKey: true },
    });
    if (!owned) {
      return NextResponse.json(
        { error: "You haven't unlocked that title yet" },
        { status: 403 }
      );
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { equippedTitleKey: key },
  });

  return NextResponse.json({ ok: true, equippedKey: key });
}
