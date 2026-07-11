import { NextResponse } from "next/server";
import { ensureWalletDefaults } from "@/lib/finance";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { WalletTransactionCreateSchema } from "@/lib/validators";
import {
  reverseWalletAllocations,
  WalletRuleError,
  walletTransactionInclude,
  writeWalletTransaction,
} from "@/lib/wallet-ledger";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const parsed = WalletTransactionCreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "流水内容不完整" },
      { status: 400 },
    );
  }
  const { plan } = await ensureWalletDefaults(userId);
  if (!plan.rolloverCompleted) {
    return NextResponse.json({ error: "请先处理上月生活费结余" }, { status: 409 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.walletTransaction.findFirst({
        where: { id, userId },
        include: { allocations: true, refund: { select: { id: true } } },
      });
      if (!existing) throw new WalletRuleError("流水不存在", 404);
      if (existing.type === "refund" || existing.refund) {
        throw new WalletRuleError("退款流水及已退款支出不能编辑", 409);
      }
      await reverseWalletAllocations(tx, existing.allocations);
      await tx.walletAllocation.deleteMany({ where: { transactionId: id } });
      await writeWalletTransaction(tx, userId, plan, parsed.data, id);
    });
    const updated = await prisma.walletTransaction.findUniqueOrThrow({
      where: { id },
      include: walletTransactionInclude,
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof WalletRuleError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  try {
    await prisma.$transaction(async (tx) => {
      const transaction = await tx.walletTransaction.findFirst({
        where: { id, userId },
        include: { allocations: true, refund: { select: { id: true } } },
      });
      if (!transaction) throw new WalletRuleError("流水不存在", 404);
      if (transaction.refund) {
        throw new WalletRuleError("请先删除对应的退款流水", 409);
      }
      await reverseWalletAllocations(tx, transaction.allocations);
      await tx.walletTransaction.delete({ where: { id } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof WalletRuleError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
