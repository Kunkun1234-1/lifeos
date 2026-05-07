import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  const { id } = await params;

  const ach = await prisma.achievement.findUnique({ where: { id } });
  if (!ach) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ach.ownerUserId !== userId) {
    return NextResponse.json({ error: "Cannot delete a system achievement" }, { status: 403 });
  }

  await prisma.achievement.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
