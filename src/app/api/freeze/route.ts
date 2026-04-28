import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";

const FREEZE_COST_GOLD = 50;

export async function GET() {
  const userId = await getCurrentUserId();
  const stash = await prisma.streakFreeze.findUnique({ where: { userId } });
  return NextResponse.json({
    count: stash?.count ?? 0,
    totalUsed: stash?.totalUsed ?? 0,
    costGold: FREEZE_COST_GOLD,
  });
}

/** Buy a Streak Freeze with Gold. */
export async function POST() {
  const userId = await getCurrentUserId();
  const currency = await prisma.currency.findUnique({ where: { userId } });
  if (!currency || currency.gold < FREEZE_COST_GOLD) {
    return NextResponse.json(
      { error: "Insufficient gold", need: FREEZE_COST_GOLD, have: currency?.gold ?? 0 },
      { status: 400 }
    );
  }

  const [stash, updatedCurrency] = await prisma.$transaction([
    prisma.streakFreeze.upsert({
      where: { userId },
      create: { userId, count: 1 },
      update: { count: { increment: 1 } },
    }),
    prisma.currency.update({
      where: { userId },
      data: { gold: { decrement: FREEZE_COST_GOLD } },
    }),
  ]);

  return NextResponse.json({ stash, currency: updatedCurrency });
}
