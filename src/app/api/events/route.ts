import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { getEventSnapshot } from "@/lib/events";

export async function GET() {
  const userId = await getCurrentUserId();
  // Pull a window: anything that started in the last 60 days OR ends in the next 30 days.
  const now = new Date();
  const lookbackDays = 60;
  const lookaheadDays = 30;
  const lookbackStart = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
  const lookaheadEnd = new Date(now.getTime() + lookaheadDays * 24 * 60 * 60 * 1000);

  const events = await prisma.event.findMany({
    where: {
      OR: [
        { startsAt: { gte: lookbackStart, lte: lookaheadEnd } },
        { endsAt: { gte: lookbackStart, lte: lookaheadEnd } },
        // Currently active
        { AND: [{ startsAt: { lte: now } }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: { startsAt: "asc" },
  });

  const snapshots = await Promise.all(events.map((e) => getEventSnapshot(userId, e)));
  return NextResponse.json(snapshots);
}
