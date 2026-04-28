import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { DecisionReviewSchema } from "@/lib/validators";
import { grantReward } from "@/lib/rewards";
import { safeCheck } from "@/lib/achievements";
import { serializeDecision } from "@/lib/decisions";

type Params = { params: Promise<{ id: string }> };

const DECISION_INCLUDE = {
  area: true,
  principles: { include: { principle: true } },
};

export async function POST(req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const body = await req.json();
  const data = DecisionReviewSchema.parse(body);

  const existing = await prisma.decision.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.chosenIndex === null) {
    return NextResponse.json(
      { error: "Cannot review a decision that has no chosen option yet" },
      { status: 400 }
    );
  }
  if (existing.status === "reviewed") {
    return NextResponse.json(
      { error: "Decision already reviewed" },
      { status: 400 }
    );
  }

  const updated = await prisma.decision.update({
    where: { id },
    data: {
      outcome: data.outcome,
      lessons: data.lessons ?? null,
      rating: data.rating,
      status: "reviewed",
      reviewedAt: new Date(),
    },
    include: DECISION_INCLUDE,
  });

  // Post-mortem is the hard part — bigger reward.
  const reward = await grantReward({
    userId,
    xp: 80,
    gold: 30,
    fate: 1,
    source: "bonus",
    sourceId: id,
    areaId: existing.areaId,
  });
  const unlocks = await safeCheck(userId);

  return NextResponse.json({ decision: serializeDecision(updated), reward, unlocks });
}
