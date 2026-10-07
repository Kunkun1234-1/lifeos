import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { planNoteRestore, serializeNote } from "@/lib/notes";

type Params = { params: Promise<{ id: string }> };

const NOTE_INCLUDE = {
  area: { select: { id: true, name: true, icon: true, color: true } },
  project: { select: { id: true, title: true } },
  goal: { select: { id: true, objective: true } },
};

export async function POST(_req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;

  const result = await prisma.$transaction(async (tx) => {
    const all = await tx.note.findMany({
      where: { userId },
      select: {
        id: true,
        parentId: true,
        deletedAt: true,
        deletionBatchId: true,
      },
    });
    const selected = all.find((note) => note.id === id);
    if (!selected) return { status: "missing" as const };
    if (!selected.deletedAt) return { status: "active" as const };

    const plan = planNoteRestore(all, id);
    if (plan.restoredIds.length === 0) return { status: "missing" as const };

    if (plan.detachRootIds.length > 0) {
      await tx.note.updateMany({
        where: { userId, id: { in: plan.detachRootIds } },
        data: { parentId: null },
      });
    }
    await tx.note.updateMany({
      where: { userId, id: { in: plan.restoredIds } },
      data: { deletedAt: null, deletionBatchId: null },
    });
    const note = await tx.note.findFirstOrThrow({
      where: { id, userId, deletedAt: null },
      include: NOTE_INCLUDE,
    });
    return {
      status: "restored" as const,
      note,
      restoredIds: plan.restoredIds,
    };
  });

  if (result.status === "missing") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (result.status === "active") {
    return NextResponse.json({ error: "页面不在垃圾桶中" }, { status: 409 });
  }
  return NextResponse.json({
    note: serializeNote(result.note),
    restoredIds: result.restoredIds,
  });
}
