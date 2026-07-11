import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ensureWalletDefaults } from "@/lib/finance";
import { normalizeGachaImageUrl } from "@/lib/gacha-assets";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { WalletRuleError, writeWalletTransaction } from "@/lib/wallet-ledger";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const idempotencyKey =
    req.headers.get("Idempotency-Key")?.trim().slice(0, 120) || crypto.randomUUID();

  const duplicate = await prisma.rewardRedemption.findUnique({
    where: { userId_idempotencyKey: { userId, idempotencyKey } },
    include: { reward: true },
  });
  if (duplicate) return purchaseResponse(userId, duplicate);

  const reward = await prisma.rewardItem.findFirst({
    where: { id, userId, archived: false },
  });
  if (!reward) return NextResponse.json({ error: "商品不存在或已下架" }, { status: 404 });

  const { plan } = await ensureWalletDefaults(userId);
  if (reward.costMoneyCents > 0 && !plan.initialized) {
    return NextResponse.json({ error: "请先完成钱包初始化" }, { status: 409 });
  }
  if (reward.costMoneyCents > 0 && !plan.rolloverCompleted) {
    return NextResponse.json({ error: "请先处理上月生活费结余" }, { status: 409 });
  }

  try {
    const redemptionId = await prisma.$transaction(async (tx) => {
      if (reward.costGold > 0) {
        const goldUpdate = await tx.currency.updateMany({
          where: { userId, gold: { gte: reward.costGold } },
          data: { gold: { decrement: reward.costGold } },
        });
        if (goldUpdate.count !== 1) throw new PurchaseRuleError("gold 余额不足");
      }

      let walletTransactionId: string | null = null;
      if (reward.costMoneyCents > 0) {
        const walletTransaction = await writeWalletTransaction(tx, userId, plan, {
          type: "expense",
          amountCents: reward.costMoneyCents,
          currencyCode: "CNY",
          necessity: "optional",
          sourcePoolType: "flexible",
          acknowledgeWarning: false,
          counterparty: reward.name,
          note: "奖励商店购买",
        });
        walletTransactionId = walletTransaction.id;
      }

      const redemption = await tx.rewardRedemption.create({
        data: {
          userId,
          rewardId: reward.id,
          costMoneyCents: reward.costMoneyCents,
          costGold: reward.costGold,
          costGems: 0,
          source: "store",
          status: "available",
          idempotencyKey,
          walletTransactionId,
          fulfilledAt: reward.costMoneyCents > 0 ? new Date() : null,
        },
      });

      await tx.rewardItem.update({
        where: { id: reward.id },
        data: { redeemedCount: { increment: 1 } },
      });

      return redemption.id;
    });

    const redemption = await prisma.rewardRedemption.findUniqueOrThrow({
      where: { id: redemptionId },
      include: { reward: true },
    });
    return purchaseResponse(userId, redemption);
  } catch (error) {
    if (error instanceof WalletRuleError || error instanceof PurchaseRuleError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.rewardRedemption.findUnique({
        where: { userId_idempotencyKey: { userId, idempotencyKey } },
        include: { reward: true },
      });
      if (existing) return purchaseResponse(userId, existing);
    }
    throw error;
  }
}

async function purchaseResponse(
  userId: string,
  redemption: Prisma.RewardRedemptionGetPayload<{ include: { reward: true } }>,
) {
  const [currency, flexiblePool] = await Promise.all([
    prisma.currency.findUnique({ where: { userId } }),
    prisma.walletPool.findUnique({ where: { userId_type: { userId, type: "flexible" } } }),
  ]);

  return NextResponse.json({
    redemption: {
      id: redemption.id,
      status: redemption.status,
      costMoneyCents: redemption.costMoneyCents,
      costGold: redemption.costGold,
    },
    reward: {
      ...redemption.reward,
      imageUrl: normalizeGachaImageUrl(redemption.reward.imageUrl),
    },
    balances: {
      gold: currency?.gold ?? 0,
      moneyAvailableCents: flexiblePool?.balanceCents ?? 0,
    },
  });
}

class PurchaseRuleError extends Error {}
