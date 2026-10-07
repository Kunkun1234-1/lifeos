import { NextResponse } from "next/server";
import { MilestoneUpdateSchema } from "@lifeos/contracts";
import {
  deleteMilestone,
  getMilestone,
  MilestoneLinkError,
  MilestoneNotFoundError,
  updateMilestone,
} from "@lifeos/domain";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;

  try {
    return NextResponse.json(await getMilestone(prisma, userId, id));
  } catch (error) {
    if (error instanceof MilestoneNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}

export async function PATCH(req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const data = MilestoneUpdateSchema.parse(await req.json());

  try {
    return NextResponse.json(await updateMilestone(prisma, userId, id, data));
  } catch (error) {
    if (error instanceof MilestoneNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof MilestoneLinkError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;

  try {
    await deleteMilestone(prisma, userId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof MilestoneNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
