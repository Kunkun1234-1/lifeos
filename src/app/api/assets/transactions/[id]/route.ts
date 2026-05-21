import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const existing = await prisma.financeTransaction.findFirst({
    where: { id, userId },
    select: {
      id: true,
      amountCents: true,
      sourceAccountId: true,
      targetAccountId: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    if (existing.sourceAccountId) {
      await tx.financeAccount.update({
        where: { id: existing.sourceAccountId },
        data: { balanceCents: { increment: existing.amountCents } },
      });
    }
    if (existing.targetAccountId) {
      await tx.financeAccount.update({
        where: { id: existing.targetAccountId },
        data: { balanceCents: { decrement: existing.amountCents } },
      });
    }
    await tx.financeTransaction.delete({ where: { id: existing.id } });
  });

  return NextResponse.json({ ok: true });
}
