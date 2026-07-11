import { NextResponse } from "next/server";
import { ensureWalletDefaults } from "@/lib/finance";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";

export async function POST() {
  const userId = await getCurrentUserId();
  const { plan } = await ensureWalletDefaults(userId);
  if (!plan.initialized) {
    return NextResponse.json({ error: "请先完成钱包初始化" }, { status: 409 });
  }
  if (plan.rolloverCompleted) {
    return NextResponse.json({ error: "本月已经处理过生活费结余" }, { status: 409 });
  }

  const amountCents = await prisma.$transaction(async (tx) => {
    const pools = await tx.walletPool.findMany({ where: { userId } });
    const living = pools.find((pool) => pool.type === "living");
    const flexible = pools.find((pool) => pool.type === "flexible");
    if (!living || !flexible) throw new Error("Wallet pools are incomplete");

    const amount = living.balanceCents;
    if (amount > 0) {
      const transaction = await tx.walletTransaction.create({
        data: {
          userId,
          type: "transfer",
          amountCents: amount,
          sourcePoolType: "living",
          targetPoolType: "flexible",
          counterparty: "月度结转",
          note: "上月生活费结余转入流动资金",
        },
      });
      await tx.walletPool.update({
        where: { id: living.id },
        data: { balanceCents: 0 },
      });
      const updatedFlexible = await tx.walletPool.update({
        where: { id: flexible.id },
        data: { balanceCents: { increment: amount } },
      });
      await tx.walletAllocation.createMany({
        data: [
          {
            transactionId: transaction.id,
            poolId: living.id,
            amountCents: -amount,
            balanceAfterCents: 0,
          },
          {
            transactionId: transaction.id,
            poolId: flexible.id,
            amountCents: amount,
            balanceAfterCents: updatedFlexible.balanceCents,
          },
        ],
      });
    }

    await tx.walletMonthlyPlan.update({
      where: { id: plan.id },
      data: { rolloverCompleted: true, rolloverAt: new Date() },
    });
    return amount;
  });

  return NextResponse.json({ ok: true, amountCents });
}
