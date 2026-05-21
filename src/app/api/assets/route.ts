import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import { ensureFinanceDefaults, monthWindow, parseTags } from "@/lib/finance";

export async function GET() {
  const user = await getCurrentUser();
  await ensureFinanceDefaults(user.id);

  const { start, end } = monthWindow();
  const [accounts, categories, transactions, monthTransactions] = await Promise.all([
    prisma.financeAccount.findMany({
      where: { userId: user.id, archived: false },
      orderBy: [{ type: "asc" }, { createdAt: "asc" }],
    }),
    prisma.financeCategory.findMany({
      where: { userId: user.id, archived: false },
      orderBy: [{ kind: "asc" }, { order: "asc" }, { name: "asc" }],
    }),
    prisma.financeTransaction.findMany({
      where: { userId: user.id },
      include: {
        sourceAccount: { select: { id: true, name: true, type: true } },
        targetAccount: { select: { id: true, name: true, type: true } },
        category: { select: { id: true, name: true, kind: true, color: true } },
      },
      orderBy: { occurredAt: "desc" },
      take: 80,
    }),
    prisma.financeTransaction.findMany({
      where: {
        userId: user.id,
        occurredAt: { gte: start, lt: end },
      },
      select: { type: true, amountCents: true, categoryId: true },
    }),
  ]);

  const includedBalances = accounts
    .filter((account) => account.includeInNetWorth)
    .map((account) => account.balanceCents);
  const netWorthCents = includedBalances.reduce((sum, amount) => sum + amount, 0);
  const assetsCents = includedBalances
    .filter((amount) => amount > 0)
    .reduce((sum, amount) => sum + amount, 0);
  const liabilitiesCents = Math.abs(
    includedBalances.filter((amount) => amount < 0).reduce((sum, amount) => sum + amount, 0),
  );

  const monthIncomeCents = monthTransactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amountCents, 0);
  const monthExpenseCents = monthTransactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amountCents, 0);
  const expenseCategories = categories.filter((category) => category.kind === "expense");
  const monthBudgetCents = expenseCategories.reduce(
    (sum, category) => sum + category.monthlyBudgetCents,
    0,
  );

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const expenseBuckets = new Map<
    string,
    { categoryId: string | null; name: string; color: string; amountCents: number; budgetCents: number }
  >();
  for (const item of monthTransactions) {
    if (item.type !== "expense") continue;
    const category = item.categoryId ? categoryById.get(item.categoryId) : null;
    const key = category?.id ?? "uncategorized";
    const prev =
      expenseBuckets.get(key) ??
      {
        categoryId: category?.id ?? null,
        name: category?.name ?? "未分类",
        color: category?.color ?? "#9a8f7f",
        amountCents: 0,
        budgetCents: category?.monthlyBudgetCents ?? 0,
      };
    prev.amountCents += item.amountCents;
    expenseBuckets.set(key, prev);
  }

  return NextResponse.json({
    summary: {
      netWorthCents,
      assetsCents,
      liabilitiesCents,
      monthIncomeCents,
      monthExpenseCents,
      monthNetCents: monthIncomeCents - monthExpenseCents,
      monthBudgetCents,
      monthBudgetUsedRate: monthBudgetCents > 0 ? monthExpenseCents / monthBudgetCents : null,
    },
    currency: user.currency ?? { gold: 0, gems: 0, fate: 0 },
    accounts,
    categories,
    transactions: transactions.map((transaction) => ({
      ...transaction,
      tags: parseTags(transaction.tags),
    })),
    expenseByCategory: [...expenseBuckets.values()].sort(
      (a, b) => b.amountCents - a.amountCents,
    ),
  });
}
