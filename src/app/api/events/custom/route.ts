import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { CustomEventCreateSchema } from "@/lib/validators";

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  const body = await req.json();
  const data = CustomEventCreateSchema.parse(body);

  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(data.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return NextResponse.json({ error: "Invalid startsAt/endsAt" }, { status: 400 });
  }
  if (endsAt <= startsAt) {
    return NextResponse.json({ error: "endsAt must be after startsAt" }, { status: 400 });
  }

  // De-dupe mission keys
  const seen = new Set<string>();
  for (const m of data.missions) {
    if (seen.has(m.key)) {
      return NextResponse.json({ error: `Duplicate mission key: ${m.key}` }, { status: 400 });
    }
    seen.add(m.key);
  }

  const created = await prisma.event.create({
    data: {
      key: `u:${userId.slice(-6)}:${Date.now().toString(36)}`,
      name: data.name,
      description: data.description,
      emoji: data.emoji,
      imageUrl: data.imageUrl ?? null,
      themeColor: data.themeColor,
      startsAt,
      endsAt,
      missions: JSON.stringify(data.missions),
      bonusXp: data.bonusXp,
      bonusGold: data.bonusGold,
      bonusGems: data.bonusGems,
      bonusFate: data.bonusFate,
      ownerUserId: userId,
    },
    select: { id: true },
  });

  return NextResponse.json({ id: created.id });
}
