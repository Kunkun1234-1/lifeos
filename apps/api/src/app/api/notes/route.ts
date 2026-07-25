import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { NoteCreateSchema } from "@/lib/validators";
import { grantReward } from "@/lib/rewards";
import { safeCheck } from "@/lib/achievements";
import {
  NOTE_MAX_DEPTH,
  getNoteDepth,
  hasNoteWritableContent,
  normalizeNoteTitle,
  serializeNote,
  tagsToString,
  tagFilterPattern,
} from "@/lib/notes";
import type { Prisma } from "@prisma/client";
import type { ZodError } from "zod";

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

async function resolveParentDepth(userId: string, parentId: string | null | undefined) {
  if (!parentId) return -1;
  const parent = await prisma.note.findFirst({
    where: { id: parentId, userId },
    select: { id: true, parentId: true },
  });
  if (!parent) return null;

  const getParentId = async (id: string) => {
    const row = await prisma.note.findFirst({
      where: { id, userId },
      select: { parentId: true },
    });
    return row?.parentId;
  };

  try {
    return await getNoteDepth(getParentId, parentId);
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");
  const tag = url.searchParams.get("tag");
  const areaId = url.searchParams.get("areaId");
  const projectId = url.searchParams.get("projectId");
  const goalId = url.searchParams.get("goalId");
  const q = url.searchParams.get("q");
  const archived = url.searchParams.get("archived") === "1";

  const where: Prisma.NoteWhereInput = { userId, archived };
  if (kind) where.kind = kind;
  if (areaId) where.areaId = areaId;
  if (projectId) where.projectId = projectId;
  if (goalId) where.goalId = goalId;
  if (tag) where.tags = { contains: tagFilterPattern(tag) };
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { body: { contains: q } },
      { author: { contains: q } },
      { sourceTitle: { contains: q } },
    ];
  }

  const notes = await prisma.note.findMany({
    where,
    include: NOTE_INCLUDE,
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    take: 200,
  });
  return NextResponse.json(notes.map(serializeNote));
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  const body = await req.json().catch(() => ({}));
  const parsed = NoteCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstValidationMessage(parsed.error), details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // Preserve body-only notes so normalizeNoteTitle can derive their title from
  // the first non-empty body line. Truly empty workspace pages get a stable
  // placeholder instead.
  const createPayload = hasNoteWritableContent(data)
    ? data
    : { ...data, title: "未命名页面" };

  const parentId = data.parentId ?? null;
  if (parentId) {
    const parentDepth = await resolveParentDepth(userId, parentId);
    if (parentDepth === null) {
      return NextResponse.json({ error: "父页面不存在或不属于你" }, { status: 400 });
    }
    if (parentDepth + 1 >= NOTE_MAX_DEPTH) {
      return NextResponse.json(
        { error: `页面嵌套最多 ${NOTE_MAX_DEPTH} 层` },
        { status: 400 }
      );
    }
  }

  // Verify ownership of any cross-link IDs
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

  const siblingWhere = { userId, parentId, archived: false };
  let position = data.position;
  if (position === undefined) {
    const agg = await prisma.note.aggregate({
      where: siblingWhere,
      _max: { position: true },
    });
    position = (agg._max.position ?? -1) + 1;
  }

  const note = await prisma.note.create({
    data: {
      userId,
      parentId,
      position,
      icon: data.icon ?? null,
      coverUrl: data.coverUrl ?? null,
      kind: data.kind,
      title: normalizeNoteTitle(createPayload),
      body: data.body,
      sourceUrl: data.sourceUrl ?? null,
      sourceTitle: data.sourceTitle ?? null,
      author: data.author ?? null,
      tags: tagsToString(data.tags),
      areaId: data.areaId ?? null,
      projectId: data.projectId ?? null,
      goalId: data.goalId ?? null,
      pinned: data.pinned,
    },
    include: NOTE_INCLUDE,
  });

  const reward = await grantReward({
    userId,
    xp: 15,
    gold: 5,
    source: "bonus",
    sourceId: note.id,
    areaId: data.areaId ?? null,
  });
  after(() => safeCheck(userId));

  return NextResponse.json(
    { note: serializeNote(note), reward, unlocks: [] },
    { status: 201 }
  );
}
