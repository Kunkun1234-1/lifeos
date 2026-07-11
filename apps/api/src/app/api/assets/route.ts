import { NextResponse } from "next/server";
import { ensureWalletDefaults, monthWindow } from "@/lib/finance";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import { walletTransactionInclude } from "@/lib/wallet-ledger";

export async function GET() {
  const user = await getCurrentUser();
  const { plan } = await ensureWalletDefaults(user.id);
  const { start, end } = monthWindow();

  const [pools, transactions, monthTransactions] = await Promise.all([
    prisma.walletPool.findMany({
      where: { userId: user.id },
      orderBy: { type: "asc" },
    }),
    prisma.walletTransaction.findMany({
      where: { userId: user.id },
      include: walletTransactionInclude,
      orderBy: { occurredAt: "desc" },
      take: 80,
    }),
    prisma.walletTransaction.findMany({
      where: { userId: user.id, occurredAt: { gte: start, lt: end } },
      select: { type: true, amountCents: true, necessity: true },
    }),
  ]);

  const livingBalanceCents =
    pools.find((pool) => pool.type === "living")?.balanceCents ?? 0;
  const monthIncomeCents = sumTransactions(monthTransactions, "income");
  const monthExpenseCents = sumTransactions(monthTransactions, "expense");
  const monthRefundCents = sumTransactions(monthTransactions, "refund");
  const monthEssentialExpenseCents = monthTransactions
    .filter((item) => item.type === "expense" && item.necessity === "essential")
    .reduce((sum, item) => sum + item.amountCents, 0);
  const monthOptionalExpenseCents = monthTransactions
    .filter((item) => item.type === "expense" && item.necessity === "optional")
    .reduce((sum, item) => sum + item.amountCents, 0);

  return NextResponse.json({
    summary: {
      totalBalanceCents: pools.reduce((sum, pool) => sum + pool.balanceCents, 0),
      monthIncomeCents,
      monthExpenseCents,
      monthRefundCents,
      monthNetCents: monthIncomeCents + monthRefundCents - monthExpenseCents,
      monthEssentialExpenseCents,
      monthOptionalExpenseCents,
    },
    currency: user.currency ?? { gold: 0, gems: 0, fate: 0 },
    pools,
    plan: {
      id: plan.id,
      month: plan.month,
      livingTargetCents: plan.livingTargetCents,
      livingGapCents: Math.max(plan.livingTargetCents - livingBalanceCents, 0),
      savingsRateBps: plan.savingsRateBps,
      flexibleRateBps: 10_000 - plan.savingsRateBps,
      carryLivingTarget: plan.carryLivingTarget,
      initialized: plan.initialized,
      rolloverCompleted: plan.rolloverCompleted,
    },
    transactions,
  });
}

function sumTransactions(
  transactions: Array<{ type: string; amountCents: number }>,
  type: "income" | "expense" | "refund",
) {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((sum, transaction) => sum + transaction.amountCents, 0);
}
