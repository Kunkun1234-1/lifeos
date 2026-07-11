import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { KRUpdateSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string; krId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id, krId } = await params;
  const body = await req.json();
  const data = KRUpdateSchema.parse(body);

  // Validate ownership
  const goal = await prisma.goal.findFirst({ where: { id, userId } });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.keyResult.update({
    where: { id: krId },
    data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id, krId } = await params;
  const goal = await prisma.goal.findFirst({ where: { id, userId } });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.keyResult.delete({ where: { id: krId } });
  return NextResponse.json({ ok: true });
}
