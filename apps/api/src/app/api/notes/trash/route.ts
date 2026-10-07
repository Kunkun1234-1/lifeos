import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { serializeNote } from "@/lib/notes";

const NOTE_INCLUDE = {
  area: { select: { id: true, name: true, icon: true, color: true } },
  project: { select: { id: true, title: true } },
  goal: { select: { id: true, objective: true } },
};

export async function GET() {
  const userId = await getCurrentUserId();
  const notes = await prisma.note.findMany({
    where: { userId, deletedAt: { not: null } },
    include: NOTE_INCLUDE,
    orderBy: [{ deletedAt: "desc" }, { position: "asc" }],
  });
  return NextResponse.json(notes.map(serializeNote));
}
