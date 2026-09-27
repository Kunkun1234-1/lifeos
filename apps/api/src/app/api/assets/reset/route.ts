import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";

export async function POST() {
  const userId = await getCurrentUserId();

  await prisma.$transaction(async (tx) => {
    // Refund rows reference their original transactions with a restrictive foreign key.
    await tx.walletTransaction.deleteMany({ where: { userId, type: "refund" } });
    await tx.walletTransaction.deleteMany({ where: { userId } });
    await tx.walletPool.deleteMany({ where: { userId } });
    await tx.walletMonthlyPlan.deleteMany({ where: { userId } });
  });

  return NextResponse.json({ ok: true });
}
