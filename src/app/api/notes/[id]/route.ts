import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { NoteUpdateSchema } from "@/lib/validators";
import { serializeNote, tagsToString } from "@/lib/notes";

type Params = { params: Promise<{ id: string }> };

const NOTE_INCLUDE = {
  area: { select: { id: true, name: true, icon: true, color: true } },
  project: { select: { id: true, title: true } },
  goal: { select: { id: true, objective: true } },
};

export async function PATCH(req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = NoteUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const existing = await prisma.note.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify ownership of any newly-linked cross-link IDs
  const ownership: Promise<unknown>[] = [];
  if (data.areaId) {
    ownership.push(
      prisma.area.findFirst({ where: { id: data.areaId, userId }, select: { id: true } })
    );
  }
  if (data.projectId) {
    ownership.push(
      prisma.project.findFirst({ where: { id: data.projectId, userId }, select: { id: true } })
    );
  }
  if (data.goalId) {
    ownership.push(
      prisma.goal.findFirst({ where: { id: data.goalId, userId }, select: { id: true } })
    );
  }
  const owned = await Promise.all(ownership);
  if (owned.some((v) => v === null)) {
    return NextResponse.json(
      { error: "Linked area/project/goal not found or not yours" },
      { status: 400 }
    );
  }

  const updated = await prisma.note.update({
    where: { id },
    data: {
      kind: data.kind,
      title: data.title,
      body: data.body,
      sourceUrl: data.sourceUrl,
      sourceTitle: data.sourceTitle,
      author: data.author,
      tags: data.tags ? tagsToString(data.tags) : undefined,
      areaId: data.areaId,
      projectId: data.projectId,
      goalId: data.goalId,
      pinned: data.pinned,
      archived: data.archived,
    },
    include: NOTE_INCLUDE,
  });
  return NextResponse.json(serializeNote(updated));
}

export async function DELETE(_req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  await prisma.note.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
