import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { getOrGenerateTodayCommissions, parseItems } from "@/lib/commissions";

export async function GET() {
  const userId = await getCurrentUserId();
  const row = await getOrGenerateTodayCommissions(userId);
  const items = parseItems(row.items);
  return NextResponse.json({
    id: row.id,
    date: row.date,
    items,
    completedCount: row.completedCount,
    bonusClaimed: row.bonusClaimed,
  });
}

export async function POST() {
  // Regenerate today's commissions (drop & re-pick). Useful if user added new items today.
  const userId = await getCurrentUserId();
  const existing = await prisma.dailyCommission.findUnique({
    where: { userId_date: { userId, date: new Date().toISOString().slice(0, 10) } },
  });

  if (existing) {
    // Only allow regeneration if nothing is completed yet (don't erase progress)
    if (existing.completedCount > 0) {
      return NextResponse.json(
        { error: "Cannot regenerate — some items already completed" },
        { status: 400 }
      );
    }
    await prisma.dailyCommission.delete({ where: { id: existing.id } });
  }
  const row = await getOrGenerateTodayCommissions(userId);
  return NextResponse.json({
    id: row.id,
    date: row.date,
    items: parseItems(row.items),
    completedCount: row.completedCount,
    bonusClaimed: row.bonusClaimed,
  });
}
