import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { PrincipleUpdateSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const body = await req.json();
  const data = PrincipleUpdateSchema.parse(body);

  const existing = await prisma.principle.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.principle.update({
    where: { id },
    data: {
      title: data.title,
      body: data.body,
      source: data.source,
      category: data.category,
      emoji: data.emoji,
      archived: data.archived,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  await prisma.principle.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
