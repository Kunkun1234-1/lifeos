import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { DecisionCreateSchema } from "@/lib/validators";
import { grantReward } from "@/lib/rewards";
import { safeCheck } from "@/lib/achievements";
import { serializeDecision } from "@/lib/decisions";

const DECISION_INCLUDE = {
  area: true,
  principles: { include: { principle: true } },
};

export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const decisions = await prisma.decision.findMany({
    where: { userId, ...(status ? { status } : {}) },
    include: DECISION_INCLUDE,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(decisions.map(serializeDecision));
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  const body = await req.json();
  const data = DecisionCreateSchema.parse(body);

  // Sanitize options (strip computed `ev` if client sent it)
  const options = data.options.map((o) => ({
    label: o.label,
    prob: o.prob,
    payoff: o.payoff,
    penalty: o.penalty,
    notes: o.notes ?? null,
  }));

  const principleIds = data.principleIds ?? [];
  // Verify all referenced principles belong to this user
  if (principleIds.length > 0) {
    const owned = await prisma.principle.findMany({
      where: { id: { in: principleIds }, userId },
      select: { id: true },
    });
    if (owned.length !== principleIds.length) {
      return NextResponse.json({ error: "Invalid principleIds" }, { status: 400 });
    }
  }

  const isDecided = data.chosenIndex !== null && data.chosenIndex !== undefined;
  if (isDecided && (data.chosenIndex! < 0 || data.chosenIndex! >= options.length)) {
    return NextResponse.json({ error: "chosenIndex out of range" }, { status: 400 });
  }

  const created = await prisma.$transaction(async (tx) => {
    const decision = await tx.decision.create({
      data: {
        userId,
        title: data.title,
        context: data.context,
        areaId: data.areaId ?? null,
        stakes: data.stakes,
        options: JSON.stringify(options),
        chosenIndex: isDecided ? data.chosenIndex! : null,
        preMortem: data.preMortem ?? null,
        tenTenTen: data.tenTenTen ?? null,
        status: isDecided ? "decided" : "open",
        decidedAt: isDecided ? new Date() : null,
        reviewDueAt: data.reviewDueAt ? new Date(data.reviewDueAt) : null,
        principles: {
          create: principleIds.map((pid) => ({ principleId: pid })),
        },
      },
      include: DECISION_INCLUDE,
    });
    if (principleIds.length > 0) {
      await tx.principle.updateMany({
        where: { id: { in: principleIds } },
        data: { usageCount: { increment: 1 } },
      });
    }
    return decision;
  });

  const reward = await grantReward({
    userId,
    xp: 30,
    gold: 12,
    source: "bonus",
    sourceId: created.id,
    areaId: data.areaId ?? null,
  });
  after(() => safeCheck(userId));

  return NextResponse.json(
    { decision: serializeDecision(created), reward, unlocks: [] },
    { status: 201 }
  );
}
