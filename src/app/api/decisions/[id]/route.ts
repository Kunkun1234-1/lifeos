import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { DecisionUpdateSchema } from "@/lib/validators";
import { serializeDecision } from "@/lib/decisions";

type Params = { params: Promise<{ id: string }> };

const DECISION_INCLUDE = {
  area: true,
  principles: { include: { principle: true } },
};

export async function PATCH(req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const body = await req.json();
  const data = DecisionUpdateSchema.parse(body);

  const existing = await prisma.decision.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Reviewed is a terminal state — only POST /review can set it (it enforces
  // outcome/rating/chosenIndex invariants). Reject any client trying to flip
  // status directly.
  if (data.status === "reviewed") {
    return NextResponse.json(
      { error: "Use POST /api/decisions/[id]/review to mark a decision reviewed" },
      { status: 400 }
    );
  }
  if (existing.status === "reviewed") {
    return NextResponse.json(
      { error: "Cannot edit a reviewed decision" },
      { status: 400 }
    );
  }

  // Resolve final options array (may be edited inline) so we can range-check
  // chosenIndex against the *new* length.
  const finalOptionsLen = data.options
    ? data.options.length
    : Array.isArray(JSON.parse(existing.options))
    ? (JSON.parse(existing.options) as unknown[]).length
    : 0;
  const nextChosen =
    data.chosenIndex === undefined ? existing.chosenIndex : data.chosenIndex;
  if (
    nextChosen !== null &&
    nextChosen !== undefined &&
    (nextChosen < 0 || nextChosen >= finalOptionsLen)
  ) {
    return NextResponse.json(
      { error: "chosenIndex out of range for current options" },
      { status: 400 }
    );
  }

  const wasOpen = existing.status === "open";
  const becomingDecided =
    data.chosenIndex !== undefined && data.chosenIndex !== null && wasOpen;

  const updated = await prisma.$transaction(async (tx) => {
    // Handle principle re-link if provided
    if (data.principleIds) {
      // Verify all owned by user
      if (data.principleIds.length > 0) {
        const owned = await tx.principle.findMany({
          where: { id: { in: data.principleIds }, userId },
          select: { id: true },
        });
        if (owned.length !== data.principleIds.length) {
          throw new Error("Invalid principleIds");
        }
      }
      const previous = await tx.decisionPrinciple.findMany({
        where: { decisionId: id },
        select: { principleId: true },
      });
      const prevSet = new Set(previous.map((p) => p.principleId));
      const nextSet = new Set(data.principleIds);
      const toRemove = [...prevSet].filter((p) => !nextSet.has(p));
      const toAdd = [...nextSet].filter((p) => !prevSet.has(p));
      if (toRemove.length > 0) {
        await tx.decisionPrinciple.deleteMany({
          where: { decisionId: id, principleId: { in: toRemove } },
        });
        await tx.principle.updateMany({
          where: { id: { in: toRemove } },
          data: { usageCount: { decrement: 1 } },
        });
      }
      if (toAdd.length > 0) {
        await tx.decisionPrinciple.createMany({
          data: toAdd.map((pid) => ({ decisionId: id, principleId: pid })),
        });
        await tx.principle.updateMany({
          where: { id: { in: toAdd } },
          data: { usageCount: { increment: 1 } },
        });
      }
    }

    return tx.decision.update({
      where: { id },
      data: {
        title: data.title,
        context: data.context,
        areaId: data.areaId,
        stakes: data.stakes,
        options: data.options ? JSON.stringify(data.options) : undefined,
        chosenIndex: data.chosenIndex,
        preMortem: data.preMortem,
        tenTenTen: data.tenTenTen,
        status: data.status ?? (becomingDecided ? "decided" : undefined),
        decidedAt: becomingDecided ? new Date() : undefined,
        reviewDueAt: data.reviewDueAt ? new Date(data.reviewDueAt) : data.reviewDueAt,
      },
      include: DECISION_INCLUDE,
    });
  });

  return NextResponse.json(serializeDecision(updated));
}

export async function DELETE(_req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  // Decrement usageCount on linked principles before delete
  const links = await prisma.decisionPrinciple.findMany({
    where: { decisionId: id, decision: { userId } },
    select: { principleId: true },
  });
  if (links.length > 0) {
    await prisma.principle.updateMany({
      where: { id: { in: links.map((l) => l.principleId) } },
      data: { usageCount: { decrement: 1 } },
    });
  }
  await prisma.decision.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
