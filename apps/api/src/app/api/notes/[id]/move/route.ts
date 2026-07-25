import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { NoteMoveSchema } from "@/lib/validators";
import {
  NOTE_MAX_DEPTH,
  getNoteDepth,
  serializeNote,
  wouldCreateNoteCycle,
} from "@/lib/notes";
import type { ZodError } from "zod";

type Params = { params: Promise<{ id: string }> };

const NOTE_INCLUDE = {
  area: { select: { id: true, name: true, icon: true, color: true } },
  project: { select: { id: true, title: true } },
  goal: { select: { id: true, objective: true } },
};

function firstValidationMessage(error: ZodError) {
  const { fieldErrors } = error.flatten();
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) return `${field}: ${messages[0]}`;
  }
  return "Invalid body";
}

function makeGetParentId(userId: string) {
  return async (noteId: string) => {
    const row = await prisma.note.findFirst({
      where: { id: noteId, userId },
      select: { parentId: true },
    });
    return row?.parentId;
  };
}

export async function POST(req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = NoteMoveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstValidationMessage(parsed.error), details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { parentId: nextParentId, position: requestedPosition } = parsed.data;

  const existing = await prisma.note.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (nextParentId) {
    const parent = await prisma.note.findFirst({
      where: { id: nextParentId, userId, archived: false },
      select: { id: true },
    });
    if (!parent) {
      return NextResponse.json({ error: "父页面不存在或不属于你" }, { status: 400 });
    }
  }

  const getParentId = makeGetParentId(userId);
  if (await wouldCreateNoteCycle(getParentId, id, nextParentId)) {
    return NextResponse.json({ error: "不能将页面移动到自身或其子页面下" }, { status: 400 });
  }

  try {
    const parentDepth = await getNoteDepth(getParentId, nextParentId);
    if (parentDepth + 1 >= NOTE_MAX_DEPTH) {
      return NextResponse.json(
        { error: `页面嵌套最多 ${NOTE_MAX_DEPTH} 层` },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json({ error: "页面树结构异常" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Pull out of old sibling list
    const oldSiblings = await tx.note.findMany({
      where: {
        userId,
        parentId: existing.parentId,
        id: { not: id },
        archived: false,
      },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    for (let i = 0; i < oldSiblings.length; i++) {
      await tx.note.update({
        where: { id: oldSiblings[i].id },
        data: { position: i },
      });
    }

    // Insert into new sibling list
    const newSiblings = await tx.note.findMany({
      where: {
        userId,
        parentId: nextParentId,
        id: { not: id },
        archived: false,
      },
      orderBy: { position: "asc" },
      select: { id: true },
    });

    const insertAt = Math.min(Math.max(requestedPosition, 0), newSiblings.length);
    const reordered = [
      ...newSiblings.slice(0, insertAt).map((s) => s.id),
      id,
      ...newSiblings.slice(insertAt).map((s) => s.id),
    ];

    for (let i = 0; i < reordered.length; i++) {
      await tx.note.update({
        where: { id: reordered[i] },
        data: {
          position: i,
          ...(reordered[i] === id ? { parentId: nextParentId } : {}),
        },
      });
    }

    return tx.note.findUniqueOrThrow({
      where: { id },
      include: NOTE_INCLUDE,
    });
  });

  return NextResponse.json(serializeNote(updated));
}
