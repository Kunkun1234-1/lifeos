import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";

export async function GET() {
  const userId = await getCurrentUserId();
  const areas = await prisma.area.findMany({
    where: { userId, archived: false },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(areas);
}
