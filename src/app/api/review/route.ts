import { NextResponse } from "next/server";
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { ReviewCreateSchema } from "@/lib/validators";
import { grantReward } from "@/lib/rewards";
import { todayYMD, startOfWeekYMD, endOfWeekYMD, ymdToDate } from "@/lib/date";
import { safeCheck } from "@/lib/achievements";

export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? 30);

  const reviews = await prisma.review.findMany({
    where: { userId, ...(kind ? { kind } : {}) },
    orderBy: { createdAt: "desc" },
    take: Math.min(100, Math.max(1, limit)),
  });
  return NextResponse.json(reviews);
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  const body = await req.json();
  const data = ReviewCreateSchema.parse(body);

  // Bucket by period based on review kind
  let periodStart: Date;
  let periodEnd: Date;
  const now = new Date();
  if (data.kind === "weekly") {
    periodStart = ymdToDate(startOfWeekYMD(), false);
    periodEnd = ymdToDate(endOfWeekYMD(), true);
  } else if (data.kind === "monthly") {
    periodStart = startOfMonth(now);
    periodEnd = endOfMonth(now);
  } else if (data.kind === "quarterly") {
    periodStart = startOfQuarter(now);
    periodEnd = endOfQuarter(now);
  } else {
    const day = todayYMD();
    periodStart = ymdToDate(day, false);
    periodEnd = ymdToDate(day, true);
  }

  const review = await prisma.review.create({
    data: {
      userId,
      kind: data.kind,
      periodStart,
      periodEnd,
      content: JSON.stringify(data.content),
      mood: data.mood ?? null,
      energy: data.energy ?? null,
      focus: data.focus ?? null,
    },
  });

  // Reward scales with review depth: weekly > daily
  const REWARD_BY_KIND: Record<string, { xp: number; gold: number; fate: number; gems: number }> = {
    daily:     { xp: 30,  gold: 10, fate: 1, gems: 0 },
    weekly:    { xp: 200, gold: 60, fate: 3, gems: 1 },
    monthly:   { xp: 600, gold: 200, fate: 5, gems: 2 },
    quarterly: { xp: 1500, gold: 500, fate: 10, gems: 5 },
  };
  const r = REWARD_BY_KIND[data.kind] ?? REWARD_BY_KIND.daily;
  const reward = await grantReward({
    userId,
    xp: r.xp,
    gold: r.gold,
    gems: r.gems,
    fate: r.fate,
    source: "review",
    sourceId: review.id,
    areaId: null,
  });

  const unlocks = await safeCheck(userId);
  return NextResponse.json({ review, reward, unlocks }, { status: 201 });
}
