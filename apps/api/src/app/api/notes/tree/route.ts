import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { buildNoteForest, serializeNoteTreeNode } from "@/lib/notes";

export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  const url = new URL(req.url);
  const archived = url.searchParams.get("archived") === "1";
  const flat = url.searchParams.get("flat") === "1";
  const q = url.searchParams.get("q")?.trim() ?? "";

  const nodes = await prisma.note.findMany({
    where: {
      userId,
      archived,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { body: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      parentId: true,
      position: true,
      icon: true,
      kind: true,
      title: true,
      pinned: true,
      archived: true,
      updatedAt: true,
      _count: { select: { children: true } },
    },
    orderBy: [{ position: "asc" }, { updatedAt: "desc" }],
    take: 2000,
  });

  const serialized = nodes.map(serializeNoteTreeNode);
  if (flat || q) {
    return NextResponse.json({ nodes: serialized, forest: null });
  }
  return NextResponse.json({
    nodes: serialized,
    forest: buildNoteForest(serialized),
  });
}
