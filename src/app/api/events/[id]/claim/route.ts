import { NextResponse, after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { getEventSnapshot, BONUS_MISSION_KEY, eventStatus, parseMissions } from "@/lib/events";
import { grantReward } from "@/lib/rewards";
import { safeCheck } from "@/lib/achievements";

type Params = { params: Promise<{ id: string }> };

const Body = z.object({
  // either a mission key from the event's missions list, or "__bonus__" sentinel
  missionKey: z.string().min(1).max(80),
});

export async function POST(req: Request, { params }: Params) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const raw = await req.json().catch(() => null);
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const status = eventStatus(event.startsAt, event.endsAt);
  if (status === "upcoming") {
    return NextResponse.json({ error: "Event has not started yet" }, { status: 400 });
  }

  const snapshot = await getEventSnapshot(userId, event);
  const requestedKey = parsed.data.missionKey;
  const isBonus = requestedKey === "__bonus__";
  const claimKey = isBonus ? BONUS_MISSION_KEY(event.id) : requestedKey;

  // Already claimed?
  const existing = await prisma.userEventClaim.findUnique({
    where: { userId_eventId_missionKey: { userId, eventId: event.id, missionKey: claimKey } },
  });
  if (existing) {
    return NextResponse.json({ error: "Already claimed" }, { status: 409 });
  }

  let xp = 0, gold = 0, gems = 0, fate = 0, snapshotValue = 0;
  let unlockedEquipmentKey: string | null = null;

  if (isBonus) {
    if (!snapshot.allMissionsClaimed) {
      return NextResponse.json(
        { error: "Claim all missions first to unlock the bonus" },
        { status: 400 }
      );
    }
    xp = event.bonusXp;
    gold = event.bonusGold;
    gems = event.bonusGems;
    fate = event.bonusFate;
    if (event.bonusEquipmentKey) {
      // Verify the equipment exists, then grant it idempotently
      const eq = await prisma.equipment.findUnique({ where: { key: event.bonusEquipmentKey } });
      if (eq) {
        try {
          await prisma.userEquipment.create({
            data: { userId, equipmentKey: eq.key },
          });
          unlockedEquipmentKey = eq.key;
        } catch {
          // Already owned — silent
        }
      }
    }
  } else {
    const mission = parseMissions(event.missions).find((m) => m.key === requestedKey);
    if (!mission) {
      return NextResponse.json({ error: "Mission not found" }, { status: 404 });
    }
    const live = snapshot.missions.find((m) => m.key === requestedKey);
    if (!live || !live.done) {
      return NextResponse.json(
        {
          error: "Mission requirements not met yet",
          progress: live ? { current: live.current, target: live.target } : null,
        },
        { status: 400 }
      );
    }
    xp = mission.xpReward ?? 0;
    gold = mission.goldReward ?? 0;
    gems = mission.gemsReward ?? 0;
    fate = mission.fateReward ?? 0;
    snapshotValue = live.current;
  }

  await prisma.userEventClaim.create({
    data: { userId, eventId: event.id, missionKey: claimKey, snapshot: snapshotValue },
  });

  const reward = await grantReward({
    userId,
    xp,
    gold,
    gems,
    fate,
    source: "bonus",
    sourceId: event.id,
  });

  after(() => safeCheck(userId));

  // Re-fetch fresh snapshot for the client
  const freshEvent = await prisma.event.findUnique({ where: { id } });
  const fresh = freshEvent ? await getEventSnapshot(userId, freshEvent) : null;

  return NextResponse.json({
    ok: true,
    reward,
    event: fresh,
    unlockedEquipmentKey,
    unlocks: [],
  });
}
