import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { RoutineCreateSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const body = await req.json();
  const data = RoutineCreateSchema.partial().parse(body);

  const existing = await prisma.routine.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.routine.update({
    where: { id },
    data: {
      title: data.title,
      notes: data.notes,
      areaId: data.areaId,
      daysOfWeek: data.daysOfWeek ? JSON.stringify(data.daysOfWeek) : undefined,
      xpReward: data.xpReward,
      goldReward: data.goldReward,
    },
    include: { area: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  await prisma.routine.updateMany({
    where: { id, userId },
    data: { archived: true },
  });
  return NextResponse.json({ ok: true });
}
