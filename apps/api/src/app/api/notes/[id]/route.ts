import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { NoteUpdateSchema } from "@/lib/validators";
import {
  NOTE_MAX_DEPTH,
  countNoteDescendants,
  getNoteDepth,
  hasNoteWritableContent,
  normalizeNoteTitle,
  serializeNote,
  tagsToString,
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

export async function GET(_req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const note = await prisma.note.findFirst({
    where: { id, userId },
    include: NOTE_INCLUDE,
  });
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(serializeNote(note));
}

export async function PATCH(req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = NoteUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstValidationMessage(parsed.error), details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const existing = await prisma.note.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const nextContent = {
    title: data.title === undefined ? existing.title : data.title,
    body: data.body === undefined ? existing.body : data.body,
    sourceTitle: data.sourceTitle === undefined ? existing.sourceTitle : data.sourceTitle,
    sourceUrl: data.sourceUrl === undefined ? existing.sourceUrl : data.sourceUrl,
  };
  const updatesContent =
    data.title !== undefined ||
    data.body !== undefined ||
    data.sourceTitle !== undefined ||
    data.sourceUrl !== undefined;
  if (updatesContent && !hasNoteWritableContent(nextContent)) {
    return NextResponse.json(
      { error: "请填写标题、正文或来源信息后再保存" },
      { status: 400 }
    );
  }

  if (data.parentId !== undefined && data.parentId !== existing.parentId) {
    const nextParentId = data.parentId;
    if (nextParentId) {
      const parent = await prisma.note.findFirst({
        where: { id: nextParentId, userId },
        select: { id: true },
      });
      if (!parent) {
        return NextResponse.json({ error: "父页面不存在或不属于你" }, { status: 400 });
      }
    }

    const getParentId = makeGetParentId(userId);
    if (await wouldCreateNoteCycle(getParentId, id, nextParentId ?? null)) {
      return NextResponse.json({ error: "不能将页面移动到自身或其子页面下" }, { status: 400 });
    }

    try {
      const parentDepth = await getNoteDepth(getParentId, nextParentId ?? null);
      // parentDepth of null parent is -1 → child depth 0
      if (parentDepth + 1 >= NOTE_MAX_DEPTH) {
        return NextResponse.json(
          { error: `页面嵌套最多 ${NOTE_MAX_DEPTH} 层` },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json({ error: "页面树结构异常" }, { status: 400 });
    }
  }

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
      title: data.title === undefined ? undefined : normalizeNoteTitle(nextContent),
      body: data.body,
      parentId: data.parentId,
      position: data.position,
      icon: data.icon === undefined ? undefined : data.icon,
      coverUrl: data.coverUrl,
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

  const existing = await prisma.note.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const all = await prisma.note.findMany({
    where: { userId },
    select: { id: true, parentId: true },
  });
  const descendantCount = countNoteDescendants(all, id);

  await prisma.note.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true, deletedSubtreeSize: descendantCount + 1 });
}
