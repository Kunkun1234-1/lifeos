import { NextResponse } from "next/server";
import { todayYMD } from "@/lib/date";
import { parseFrameStyle } from "@/lib/equipment";
import { ensureWalletDefaults, monthWindow } from "@/lib/finance";
import { deriveLevel } from "@/lib/gamification";
import { prisma } from "@/lib/prisma";
import { getUserXpSnapshot } from "@/lib/rewards";
import { getCurrentUser } from "@/lib/user";
import {
  getOrGenerateTodayCommissions,
  hydrateCommissionItems,
  parseItems,
} from "@/lib/commissions";

function parseList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value)
      ? value.filter((item) => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function currencySnapshot(
  currency: { gold: number; gems: number; fate: number } | null,
) {
  return {
    gold: currency?.gold ?? 0,
    gems: currency?.gems ?? 0,
    fate: currency?.fate ?? 0,
  };
}

async function getDashboardAssets(
  userId: string,
  currency: { gold: number; gems: number; fate: number },
) {
  await ensureWalletDefaults(userId);

  const { start, end } = monthWindow();
  const [pools, monthTransactions] = await Promise.all([
    prisma.walletPool.findMany({
      where: { userId },
      select: { balanceCents: true },
    }),
    prisma.walletTransaction.findMany({
      where: {
        userId,
        occurredAt: { gte: start, lt: end },
      },
      select: { type: true, amountCents: true, necessity: true },
    }),
  ]);

  const monthIncomeCents = monthTransactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amountCents, 0);
  const monthExpenseCents = monthTransactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amountCents, 0);
  const monthRefundCents = monthTransactions
    .filter((item) => item.type === "refund")
    .reduce((sum, item) => sum + item.amountCents, 0);
  const monthEssentialExpenseCents = monthTransactions
    .filter((item) => item.type === "expense" && item.necessity === "essential")
    .reduce((sum, item) => sum + item.amountCents, 0);
  const monthOptionalExpenseCents = monthTransactions
    .filter((item) => item.type === "expense" && item.necessity === "optional")
    .reduce((sum, item) => sum + item.amountCents, 0);

  return {
    summary: {
      totalBalanceCents: pools.reduce((sum, pool) => sum + pool.balanceCents, 0),
      monthIncomeCents,
      monthExpenseCents,
      monthRefundCents,
      monthNetCents: monthIncomeCents + monthRefundCents - monthExpenseCents,
      monthEssentialExpenseCents,
      monthOptionalExpenseCents,
    },
    currency,
    poolCount: pools.length,
  };
}

export async function GET() {
  const user = await getCurrentUser();
  const userId = user.id;
  const today = todayYMD();
  const currency = currencySnapshot(user.currency);

  const equippedTitlePromise = user.equippedTitleKey
    ? prisma.title.findUnique({
        where: { key: user.equippedTitleKey },
        select: { key: true, name: true, emoji: true, tier: true },
      })
    : Promise.resolve(null);

  const equippedFramePromise = user.equippedFrameKey
    ? prisma.equipment.findUnique({
        where: { key: user.equippedFrameKey },
        select: { key: true, name: true, tier: true, style: true },
      })
    : Promise.resolve(null);

  const [
    xpSnapshot,
    equippedTitle,
    equippedFrameRaw,
    areas,
    routinesRaw,
    commissionsRaw,
    tasksTodo,
    tasksDone,
    assets,
  ] = await Promise.all([
    getUserXpSnapshot(userId),
    equippedTitlePromise,
    equippedFramePromise,
    prisma.area.findMany({
      where: { userId, archived: false },
      orderBy: { order: "asc" },
    }),
    prisma.routine.findMany({
      where: { userId, archived: false },
      include: {
        area: true,
        completions: { where: { date: today } },
      },
      orderBy: { createdAt: "desc" },
    }),
    getOrGenerateTodayCommissions(userId).then(async (row) => ({
      row,
      items: await hydrateCommissionItems(parseItems(row.items), userId),
    })),
    prisma.task.findMany({
      where: { userId, status: "TODO" },
      include: { area: true, project: true },
      orderBy: [
        { status: "asc" },
        { dueDate: "asc" },
        { priority: "asc" },
        { createdAt: "desc" },
      ],
      take: 4,
    }),
    prisma.task.findMany({
      where: { userId, status: "DONE" },
      include: { area: true, project: true },
      orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
      take: 3,
    }),
    getDashboardAssets(userId, currency),
  ]);

  const leveling = deriveLevel(xpSnapshot.totalXp);
  const equippedFrame = equippedFrameRaw
    ? {
        key: equippedFrameRaw.key,
        name: equippedFrameRaw.name,
        tier: equippedFrameRaw.tier,
        style: parseFrameStyle(equippedFrameRaw.style),
      }
    : null;
  const routines = routinesRaw.map(({ completions, ...routine }) => ({
    ...routine,
    completedToday: completions.length > 0,
  }));

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email ?? null,
      class: user.class,
      timezone: user.timezone ?? "Asia/Shanghai",
      visionStatement: user.visionStatement,
      coreValues: parseList(user.coreValues),
      identityStatements: parseList(user.identityStatements),
      avatarUrl: user.avatarUrl ?? null,
      gender: user.gender ?? null,
      birthday: user.birthday ? user.birthday.toISOString() : null,
      region: user.region ?? null,
      motto: user.motto ?? null,
      onboardedAt: user.onboardedAt ? user.onboardedAt.toISOString() : null,
      createdAt: user.createdAt.toISOString(),
      totalXp: xpSnapshot.totalXp,
      xpByArea: xpSnapshot.byArea,
      level: leveling.level,
      xpIntoLevel: leveling.xpIntoLevel,
      xpForNext: leveling.xpForNext,
      levelProgress: leveling.progress,
      currency,
      equippedTitle,
      equippedFrame,
    },
    areas,
    routines,
    commissions: {
      id: commissionsRaw.row.id,
      date: commissionsRaw.row.date,
      items: commissionsRaw.items,
      completedCount: commissionsRaw.row.completedCount,
      bonusClaimed: commissionsRaw.row.bonusClaimed,
    },
    tasksTodo,
    tasksDone,
    assets,
  });
}
