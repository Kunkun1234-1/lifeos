import {
  Prisma,
  type WalletPool,
  type WalletPoolType,
  type WalletTransaction,
} from "@prisma/client";
import type { z } from "zod";
import { calculateIncomeAllocation } from "@/lib/wallet-calculations";
import { WalletTransactionCreateSchema } from "@/lib/validators";

export type WalletTransactionInput = z.infer<typeof WalletTransactionCreateSchema>;

export const walletTransactionInclude = {
  allocations: {
    include: { pool: { select: { id: true, type: true } } },
    orderBy: { createdAt: "asc" as const },
  },
  refund: { select: { id: true } },
  refundOf: { select: { id: true, counterparty: true, necessity: true } },
} satisfies Prisma.WalletTransactionInclude;

type WalletPlanRules = {
  livingTargetCents: number;
  savingsRateBps: number;
};

export async function writeWalletTransaction(
  tx: Prisma.TransactionClient,
  userId: string,
  plan: WalletPlanRules,
  data: WalletTransactionInput,
  existingId?: string,
) {
  const pools = await tx.walletPool.findMany({ where: { userId } });
  const poolByType = new Map(pools.map((pool) => [pool.type, pool]));
  const occurredAt = data.occurredAt ? new Date(data.occurredAt) : new Date();

  if (data.type === "income") {
    const livingPool = requiredPool(poolByType, "living");
    const allocation =
      data.allocations ??
      calculateIncomeAllocation({
        amountCents: data.amountCents,
        livingBalanceCents: livingPool.balanceCents,
        livingTargetCents: plan.livingTargetCents,
        savingsRateBps: plan.savingsRateBps,
      });
    const allocatedTotal =
      allocation.livingCents + allocation.savingsCents + allocation.flexibleCents;
    if (allocatedTotal !== data.amountCents) {
      throw new WalletRuleError("三个资金池的分配金额之和必须等于本次收入");
    }
    const transaction = await saveTransaction(tx, existingId, {
      userId,
      type: "income",
      amountCents: data.amountCents,
      currencyCode: data.currencyCode.toUpperCase(),
      necessity: null,
      sourcePoolType: null,
      targetPoolType: null,
      counterparty: data.counterparty?.trim() || null,
      note: data.note?.trim() || null,
      refundOfId: null,
      occurredAt,
    });
    for (const [type, amountCents] of [
      ["living", allocation.livingCents],
      ["savings", allocation.savingsCents],
      ["flexible", allocation.flexibleCents],
    ] as const) {
      if (amountCents > 0) {
        await applyWalletAllocation(
          tx,
          transaction.id,
          requiredPool(poolByType, type),
          amountCents,
        );
      }
    }
    return transaction;
  }

  if (data.type === "expense") {
    const sourcePool = requiredPool(poolByType, data.sourcePoolType);
    const livingPool = requiredPool(poolByType, "living");
    const usesFlexibleFallback =
      data.necessity === "essential" &&
      data.sourcePoolType === "flexible" &&
      livingPool.balanceCents < data.amountCents;
    if (
      data.necessity === "essential" &&
      data.sourcePoolType === "flexible" &&
      !usesFlexibleFallback
    ) {
      throw new WalletRuleError("生活费余额充足，请优先使用每月生活费");
    }
    if (usesFlexibleFallback && !data.acknowledgeWarning) {
      throw new WalletRuleError("必须支出将使用流动资金，请先确认");
    }
    if (data.necessity === "optional" && data.sourcePoolType !== "flexible") {
      throw new WalletRuleError("非必须支出需要从流动资金扣除");
    }
    const transaction = await saveTransaction(tx, existingId, {
      userId,
      type: "expense",
      amountCents: data.amountCents,
      currencyCode: data.currencyCode.toUpperCase(),
      necessity: data.necessity,
      sourcePoolType: data.sourcePoolType,
      targetPoolType: null,
      counterparty: data.counterparty?.trim() || null,
      note: data.note?.trim() || null,
      refundOfId: null,
      occurredAt,
    });
    await applyWalletAllocation(tx, transaction.id, sourcePool, -data.amountCents);
    return transaction;
  }

  if (data.sourcePoolType === data.targetPoolType) {
    throw new WalletRuleError("转出和转入资金池不能相同");
  }
  if (data.sourcePoolType === "savings" && !data.acknowledgeWarning) {
    throw new WalletRuleError("转出储蓄前需要确认");
  }
  const sourcePool = requiredPool(poolByType, data.sourcePoolType);
  const targetPool = requiredPool(poolByType, data.targetPoolType);
  const transaction = await saveTransaction(tx, existingId, {
    userId,
    type: "transfer",
    amountCents: data.amountCents,
    currencyCode: data.currencyCode.toUpperCase(),
    necessity: null,
    sourcePoolType: data.sourcePoolType,
    targetPoolType: data.targetPoolType,
    counterparty: data.counterparty?.trim() || null,
    note: data.note?.trim() || null,
    refundOfId: null,
    occurredAt,
  });
  await applyWalletAllocation(tx, transaction.id, sourcePool, -data.amountCents);
  await applyWalletAllocation(tx, transaction.id, targetPool, data.amountCents);
  return transaction;
}

export async function reverseWalletAllocations(
  tx: Prisma.TransactionClient,
  allocations: Array<{ poolId: string; amountCents: number }>,
) {
  const deltaByPool = new Map<string, number>();
  for (const allocation of allocations) {
    deltaByPool.set(
      allocation.poolId,
      (deltaByPool.get(allocation.poolId) ?? 0) + allocation.amountCents,
    );
  }
  for (const [poolId, delta] of deltaByPool) {
    const pool = await tx.walletPool.findUniqueOrThrow({ where: { id: poolId } });
    const reversedBalance = pool.balanceCents - delta;
    if (reversedBalance < 0) {
      throw new WalletRuleError("这笔资金已经被后续使用，暂时无法回滚", 409);
    }
    await tx.walletPool.update({
      where: { id: poolId },
      data: { balanceCents: reversedBalance },
    });
  }
}

export async function applyWalletAllocation(
  tx: Prisma.TransactionClient,
  transactionId: string,
  pool: WalletPool,
  amountCents: number,
) {
  if (amountCents < 0) {
    const result = await tx.walletPool.updateMany({
      where: { id: pool.id, balanceCents: { gte: -amountCents } },
      data: { balanceCents: { increment: amountCents } },
    });
    if (result.count !== 1) throw new WalletRuleError("资金池余额不足");
  } else {
    await tx.walletPool.update({
      where: { id: pool.id },
      data: { balanceCents: { increment: amountCents } },
    });
  }
  const updatedPool = await tx.walletPool.findUniqueOrThrow({ where: { id: pool.id } });
  await tx.walletAllocation.create({
    data: {
      transactionId,
      poolId: pool.id,
      amountCents,
      balanceAfterCents: updatedPool.balanceCents,
    },
  });
  pool.balanceCents = updatedPool.balanceCents;
}

export class WalletRuleError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

function requiredPool(
  poolByType: Map<WalletPoolType, WalletPool>,
  type: WalletPoolType,
) {
  const pool = poolByType.get(type);
  if (!pool) throw new WalletRuleError("钱包资金池尚未准备完成");
  return pool;
}

async function saveTransaction(
  tx: Prisma.TransactionClient,
  existingId: string | undefined,
  data: Prisma.WalletTransactionUncheckedCreateInput,
): Promise<WalletTransaction> {
  if (existingId) {
    return tx.walletTransaction.update({ where: { id: existingId }, data });
  }
  return tx.walletTransaction.create({ data });
}
