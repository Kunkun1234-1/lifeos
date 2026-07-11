import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ensureWalletDefaults } from "@/lib/finance";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import {
  applyWalletAllocation,
  WalletRuleError,
  walletTransactionInclude,
} from "@/lib/wallet-ledger";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const { plan } = await ensureWalletDefaults(userId);
  if (!plan.rolloverCompleted) {
    return NextResponse.json({ error: "请先处理上月生活费结余" }, { status: 409 });
  }

  try {
    const refundId = await prisma.$transaction(async (tx) => {
      const expense = await tx.walletTransaction.findFirst({
        where: { id, userId },
        include: { allocations: true, refund: { select: { id: true } } },
      });
      if (!expense) throw new WalletRuleError("支出流水不存在", 404);
      if (expense.type !== "expense") throw new WalletRuleError("只有支出可以退款");
      if (expense.refund) throw new WalletRuleError("这笔支出已经退款", 409);
      const sourceAllocation = expense.allocations.find(
        (allocation) => allocation.amountCents < 0,
      );
      if (!sourceAllocation || !expense.sourcePoolType) {
        throw new WalletRuleError("原支出缺少资金池记录", 409);
      }
      const pool = await tx.walletPool.findFirst({
        where: { id: sourceAllocation.poolId, userId },
      });
      if (!pool) throw new WalletRuleError("原资金池不存在", 409);

      const refund = await tx.walletTransaction.create({
        data: {
          userId,
          type: "refund",
          amountCents: expense.amountCents,
          currencyCode: expense.currencyCode,
          targetPoolType: expense.sourcePoolType,
          counterparty: expense.counterparty,
          note: `退款：${expense.note || expense.counterparty || "支出"}`,
          refundOfId: expense.id,
          occurredAt: new Date(),
        },
      });
      await applyWalletAllocation(tx, refund.id, pool, expense.amountCents);
      return refund.id;
    });
    const refund = await prisma.walletTransaction.findUniqueOrThrow({
      where: { id: refundId },
      include: walletTransactionInclude,
    });
    return NextResponse.json(refund, { status: 201 });
  } catch (error) {
    if (error instanceof WalletRuleError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "这笔支出已经退款" }, { status: 409 });
    }
    throw error;
  }
}
