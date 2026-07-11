import type { WalletPool, WalletPoolType } from "@prisma/client";
import { NextResponse } from "next/server";
import { ensureWalletDefaults } from "@/lib/finance";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { WalletInitializationSchema } from "@/lib/validators";

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  const parsed = WalletInitializationSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "初始化金额不正确" },
      { status: 400 },
    );
  }

  const { plan } = await ensureWalletDefaults(userId);
  if (plan.initialized) {
    return NextResponse.json({ error: "钱包已经初始化" }, { status: 409 });
  }

  const data = parsed.data;
  const balances = {
    living: data.livingBalanceCents,
    savings: data.savingsBalanceCents,
    flexible: data.flexibleBalanceCents,
  } satisfies Record<WalletPoolType, number>;
  const totalBalanceCents = Object.values(balances).reduce((sum, value) => sum + value, 0);

  await prisma.$transaction(async (tx) => {
    const pools = await tx.walletPool.findMany({ where: { userId } });
    const poolByType = new Map(pools.map((pool) => [pool.type, pool]));
    const existingTransactions = await tx.walletTransaction.count({ where: { userId } });
    if (existingTransactions > 0) throw new Error("WALLET_ALREADY_USED");

    let transactionId: string | null = null;
    if (totalBalanceCents > 0) {
      const transaction = await tx.walletTransaction.create({
        data: {
          userId,
          type: "income",
          amountCents: totalBalanceCents,
          counterparty: "初始资金",
          note: "钱包初始化",
        },
      });
      transactionId = transaction.id;
    }

    for (const [type, amountCents] of Object.entries(balances) as Array<
      [WalletPoolType, number]
    >) {
      const pool = requiredPool(poolByType, type);
      await tx.walletPool.update({
        where: { id: pool.id },
        data: { balanceCents: amountCents },
      });
      if (transactionId && amountCents > 0) {
        await tx.walletAllocation.create({
          data: {
            transactionId,
            poolId: pool.id,
            amountCents,
            balanceAfterCents: amountCents,
          },
        });
      }
    }

    await tx.walletMonthlyPlan.update({
      where: { id: plan.id },
      data: {
        livingTargetCents: data.livingTargetCents,
        savingsRateBps: data.savingsRateBps,
        carryLivingTarget: data.carryLivingTarget,
        initialized: true,
        rolloverCompleted: true,
      },
    });
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

function requiredPool(
  poolByType: Map<WalletPoolType, WalletPool>,
  type: WalletPoolType,
) {
  const pool = poolByType.get(type);
  if (!pool) throw new Error(`Missing ${type} wallet pool`);
  return pool;
}
