import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { TaskUpdateSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const body = await req.json();
  const data = TaskUpdateSchema.parse(body);

  const existing = await prisma.task.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.task.update({
    where: { id },
    data: {
      title: data.title,
      notes: data.notes,
      areaId: data.areaId,
      priority: data.priority,
      dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? null : undefined,
      status: data.status,
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
  await prisma.task.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
