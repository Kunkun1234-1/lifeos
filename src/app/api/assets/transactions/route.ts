import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { FinanceTransactionCreateSchema } from "@/lib/validators";

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  const body = await req.json();
  const parsed = FinanceTransactionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid transaction" },
      { status: 400 },
    );
  }
  const data = parsed.data;

  if (data.type === "income" && (!data.targetAccountId || data.sourceAccountId)) {
    return NextResponse.json(
      { error: "Income needs exactly one target account" },
      { status: 400 },
    );
  }
  if (data.type === "expense" && (!data.sourceAccountId || data.targetAccountId)) {
    return NextResponse.json(
      { error: "Expense needs exactly one source account" },
      { status: 400 },
    );
  }
  if (data.type === "transfer") {
    if (!data.sourceAccountId || !data.targetAccountId) {
      return NextResponse.json({ error: "Transfer needs both accounts" }, { status: 400 });
    }
    if (data.sourceAccountId === data.targetAccountId) {
      return NextResponse.json({ error: "Transfer accounts must be different" }, { status: 400 });
    }
  }

  const accountIds = [...new Set([data.sourceAccountId, data.targetAccountId].filter(Boolean))] as string[];
  const accounts = await prisma.financeAccount.findMany({
    where: { userId, id: { in: accountIds }, archived: false },
    select: { id: true, currencyCode: true },
  });
  if (accounts.length !== accountIds.length) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const accountCurrency = accounts[0]?.currencyCode ?? data.currencyCode;
  if (accounts.some((account) => account.currencyCode !== accountCurrency)) {
    return NextResponse.json({ error: "Cross-currency transfers are not supported yet" }, { status: 400 });
  }

  if (data.categoryId) {
    const category = await prisma.financeCategory.findFirst({
      where: { id: data.categoryId, userId, archived: false },
      select: { kind: true },
    });
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    if (category.kind !== data.type) {
      return NextResponse.json({ error: "Category type does not match transaction type" }, { status: 400 });
    }
  }

  const transaction = await prisma.$transaction(async (tx) => {
    if (data.sourceAccountId) {
      await tx.financeAccount.update({
        where: { id: data.sourceAccountId },
        data: { balanceCents: { decrement: data.amountCents } },
      });
    }
    if (data.targetAccountId) {
      await tx.financeAccount.update({
        where: { id: data.targetAccountId },
        data: { balanceCents: { increment: data.amountCents } },
      });
    }

    return tx.financeTransaction.create({
      data: {
        userId,
        type: data.type,
        amountCents: data.amountCents,
        currencyCode: accountCurrency.toUpperCase(),
        sourceAccountId: data.sourceAccountId ?? null,
        targetAccountId: data.targetAccountId ?? null,
        categoryId: data.categoryId ?? null,
        payee: data.payee?.trim() || null,
        note: data.note?.trim() || null,
        tags: JSON.stringify(data.tags),
        occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
      },
      include: {
        sourceAccount: { select: { id: true, name: true, type: true } },
        targetAccount: { select: { id: true, name: true, type: true } },
        category: { select: { id: true, name: true, kind: true, color: true } },
      },
    });
  });

  return NextResponse.json({ ...transaction, tags: data.tags }, { status: 201 });
}
