import { NextResponse } from "next/server";
import {
  MilestoneCreateSchema,
} from "@lifeos/contracts";
import {
  createMilestone,
  listMilestones,
  MilestoneLinkError,
} from "@lifeos/domain";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";

export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  const projectId = new URL(req.url).searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json(
      { error: "projectId is required" },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await listMilestones(prisma, userId, projectId));
  } catch (error) {
    if (error instanceof MilestoneLinkError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  const data = MilestoneCreateSchema.parse(await req.json());

  try {
    const milestone = await createMilestone(prisma, userId, data);
    return NextResponse.json(milestone, { status: 201 });
  } catch (error) {
    if (error instanceof MilestoneLinkError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
