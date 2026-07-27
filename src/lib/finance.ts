import { prisma } from "@/lib/prisma";
export { calculateIncomeAllocation } from "@/lib/wallet-calculations";

export const WALLET_POOL_TYPES = ["living", "savings", "flexible"] as const;

export type WalletPoolKey = (typeof WALLET_POOL_TYPES)[number];

export function monthKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function monthWindow(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

export async function ensureWalletDefaults(userId: string, now = new Date()) {
  const month = monthKey(now);
  const poolsPromise = getOrCreateWalletPools(userId);
  const planPromise = getOrCreateWalletPlan(userId, month);
  const [pools, plan] = await Promise.all([poolsPromise, planPromise]);

  return { plan, pools };
}

async function getOrCreateWalletPools(userId: string) {
  let pools = await prisma.walletPool.findMany({
    where: { userId },
    orderBy: { type: "asc" },
  });

  const existingTypes = new Set(pools.map((pool) => pool.type));
  const missingTypes = WALLET_POOL_TYPES.filter((type) => !existingTypes.has(type));
  if (missingTypes.length > 0) {
    await prisma.walletPool.createMany({
      data: missingTypes.map((type) => ({ userId, type })),
      skipDuplicates: true,
    });
    pools = await prisma.walletPool.findMany({
      where: { userId },
      orderBy: { type: "asc" },
    });
  }

  return pools;
}

async function getOrCreateWalletPlan(userId: string, month: string) {
  let plan = await prisma.walletMonthlyPlan.findUnique({
    where: { userId_month: { userId, month } },
  });

  if (!plan) {
    const previous = await prisma.walletMonthlyPlan.findFirst({
      where: { userId, month: { lt: month } },
      orderBy: { month: "desc" },
    });

    plan = await prisma.walletMonthlyPlan.upsert({
      where: { userId_month: { userId, month } },
      update: {},
      create: {
        userId,
        month,
        livingTargetCents:
          previous?.carryLivingTarget === false ? 0 : previous?.livingTargetCents ?? 0,
        savingsRateBps: previous?.savingsRateBps ?? 5000,
        carryLivingTarget: previous?.carryLivingTarget ?? true,
        initialized: previous?.initialized ?? false,
        rolloverCompleted: !previous,
      },
    });
  }

  return plan;
}
