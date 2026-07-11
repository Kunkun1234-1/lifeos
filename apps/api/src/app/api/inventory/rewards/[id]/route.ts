import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureWalletDefaults } from "@/lib/finance";
import { serializeInventoryReward } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { WalletRuleError, writeWalletTransaction } from "@/lib/wallet-ledger";

type Params = { params: Promise<{ id: string }> };

const Body = z.object({
  action: z.enum(["fulfill", "use", "discard"]),
  note: z.string().max(500).optional().nullable(),
});

export async function PATCH(req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.rewardRedemption.findFirst({
    where: { id, userId },
    include: { reward: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.action === "fulfill") {
    if (existing.status !== "pending_fulfillment") {
      return NextResponse.json({ error: "只有待兑现奖品可以兑现" }, { status: 409 });
    }

    const { plan } = await ensureWalletDefaults(userId);
    if (existing.costMoneyCents > 0 && !plan.initialized) {
      return NextResponse.json({ error: "请先完成钱包初始化" }, { status: 409 });
    }
    if (existing.costMoneyCents > 0 && !plan.rolloverCompleted) {
      return NextResponse.json({ error: "请先处理上月生活费结余" }, { status: 409 });
    }

    try {
      await prisma.$transaction(async (tx) => {
        const claimed = await tx.rewardRedemption.updateMany({
          where: { id, userId, status: "pending_fulfillment" },
          data: {
            status: "available",
            fulfilledAt: new Date(),
            note: parsed.data.note?.trim() || existing.note,
          },
        });
        if (claimed.count !== 1) throw new InventoryRuleError("奖品状态已经变化", 409);

        if (existing.costMoneyCents > 0) {
          const walletTransaction = await writeWalletTransaction(tx, userId, plan, {
            type: "expense",
            amountCents: existing.costMoneyCents,
            currencyCode: "CNY",
            necessity: "optional",
            sourcePoolType: "flexible",
            acknowledgeWarning: false,
            counterparty: existing.reward.name,
            note: "祈愿奖品兑现",
          });
          await tx.rewardRedemption.update({
            where: { id },
            data: { walletTransactionId: walletTransaction.id },
          });
        }
      });
    } catch (error) {
      if (error instanceof WalletRuleError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      if (error instanceof InventoryRuleError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      throw error;
    }
  } else {
    if (existing.status !== "available") {
      return NextResponse.json(
        { error: "只有可用奖品可以使用或丢弃" },
        { status: 409 },
      );
    }
    const now = new Date();
    const note = parsed.data.note?.trim() || null;
    const update =
      parsed.data.action === "use"
        ? { status: "used", usedAt: now, note }
        : { status: "discarded", discardedAt: now, note };
    const changed = await prisma.rewardRedemption.updateMany({
      where: { id, userId, status: "available" },
      data: update,
    });
    if (changed.count !== 1) {
      return NextResponse.json({ error: "奖品状态已经变化" }, { status: 409 });
    }
  }

  const updated = await prisma.rewardRedemption.findUniqueOrThrow({
    where: { id },
    include: { reward: true },
  });
  return NextResponse.json(serializeInventoryReward(updated));
}

class InventoryRuleError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}
