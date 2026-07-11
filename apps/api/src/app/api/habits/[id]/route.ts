import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { HabitCreateSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const body = await req.json();
  const data = HabitCreateSchema.partial().parse(body);

  const existing = await prisma.habit.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.habit.update({
    where: { id },
    data: {
      title: data.title,
      notes: data.notes,
      areaId: data.areaId,
      direction: data.direction,
      xpPerTick: data.xpPerTick,
      goldPerTick: data.goldPerTick,
    },
    include: { area: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  await prisma.habit.updateMany({
    where: { id, userId },
    data: { archived: true },
  });
  return NextResponse.json({ ok: true });
}
