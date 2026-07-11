import { NextResponse } from "next/server";
import { ensureWalletDefaults } from "@/lib/finance";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { WalletSettingsUpdateSchema } from "@/lib/validators";

export async function PUT(req: Request) {
  const userId = await getCurrentUserId();
  const parsed = WalletSettingsUpdateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "钱包设置不正确" },
      { status: 400 },
    );
  }

  const { plan } = await ensureWalletDefaults(userId);
  const updated = await prisma.walletMonthlyPlan.update({
    where: { id: plan.id },
    data: parsed.data,
  });

  return NextResponse.json({
    ...updated,
    flexibleRateBps: 10_000 - updated.savingsRateBps,
  });
}
