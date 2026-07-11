import { Prisma, type WalletNecessity, type WalletPoolType, type WalletTransactionType } from "@prisma/client";
import { NextResponse } from "next/server";
import { ensureWalletDefaults } from "@/lib/finance";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { WalletTransactionCreateSchema } from "@/lib/validators";
import {
  WalletRuleError,
  walletTransactionInclude,
  writeWalletTransaction,
} from "@/lib/wallet-ledger";

export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  const url = new URL(req.url);
  const type = parseEnum(url.searchParams.get("type"), ["income", "expense", "refund", "transfer"]);
  const necessity = parseEnum(url.searchParams.get("necessity"), ["essential", "optional"]);
  const pool = parseEnum(url.searchParams.get("pool"), ["living", "savings", "flexible"]);
  const month = url.searchParams.get("month");
  const occurredAt = month && /^\d{4}-\d{2}$/.test(month) ? monthRange(month) : undefined;

  const where: Prisma.WalletTransactionWhereInput = {
    userId,
    ...(type ? { type: type as WalletTransactionType } : {}),
    ...(necessity ? { necessity: necessity as WalletNecessity } : {}),
    ...(occurredAt ? { occurredAt } : {}),
    ...(pool
      ? {
          OR: [
            { sourcePoolType: pool as WalletPoolType },
            { targetPoolType: pool as WalletPoolType },
            { allocations: { some: { pool: { type: pool as WalletPoolType } } } },
          ],
        }
      : {}),
  };
  const transactions = await prisma.walletTransaction.findMany({
    where,
    include: walletTransactionInclude,
    orderBy: { occurredAt: "desc" },
    take: 200,
  });
  return NextResponse.json(transactions);
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  const parsed = WalletTransactionCreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "流水内容不完整" },
      { status: 400 },
    );
  }
  const { plan } = await ensureWalletDefaults(userId);
  if (!plan.initialized) {
    return NextResponse.json({ error: "请先完成钱包初始化" }, { status: 409 });
  }
  if (!plan.rolloverCompleted) {
    return NextResponse.json({ error: "请先处理上月生活费结余" }, { status: 409 });
  }

  try {
    const transactionId = await prisma.$transaction(async (tx) => {
      const transaction = await writeWalletTransaction(tx, userId, plan, parsed.data);
      return transaction.id;
    });
    const transaction = await prisma.walletTransaction.findUniqueOrThrow({
      where: { id: transactionId },
      include: walletTransactionInclude,
    });
    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    if (error instanceof WalletRuleError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}

function parseEnum<T extends string>(value: string | null, values: readonly T[]): T | null {
  return value && values.includes(value as T) ? (value as T) : null;
}

function monthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    gte: new Date(year, monthNumber - 1, 1),
    lt: new Date(year, monthNumber, 1),
  };
}
