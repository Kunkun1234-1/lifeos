import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { signedInitialBalance } from "@/lib/finance";
import { FinanceAccountCreateSchema } from "@/lib/validators";

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  const body = await req.json();
  const parsed = FinanceAccountCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid account" },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const initialBalanceCents = signedInitialBalance(data.type, data.initialBalanceCents);

  const account = await prisma.financeAccount.create({
    data: {
      userId,
      name: data.name,
      type: data.type,
      currencyCode: data.currencyCode.toUpperCase(),
      initialBalanceCents,
      balanceCents: initialBalanceCents,
      includeInNetWorth: data.includeInNetWorth,
      color: data.color,
      icon: data.icon,
    },
  });

  return NextResponse.json(account, { status: 201 });
}
