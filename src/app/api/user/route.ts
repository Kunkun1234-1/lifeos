import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import { getUserXpSnapshot } from "@/lib/rewards";
import { deriveLevel } from "@/lib/gamification";
import { UserUpdateSchema } from "@/lib/validators";
import { parseFrameStyle as parseFrameStyleLocal } from "@/lib/equipment";

function parseList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const x = JSON.parse(raw);
    return Array.isArray(x) ? x.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export async function GET() {
  const user = await getCurrentUser();
  const { totalXp, byArea } = await getUserXpSnapshot(user.id);
  const leveling = deriveLevel(totalXp);

  let equippedTitle: { key: string; name: string; emoji: string; tier: string } | null = null;
  if (user.equippedTitleKey) {
    const t = await prisma.title.findUnique({
      where: { key: user.equippedTitleKey },
      select: { key: true, name: true, emoji: true, tier: true },
    });
    if (t) equippedTitle = t;
  }

  let equippedFrame: {
    key: string;
    name: string;
    tier: string;
    style: ReturnType<typeof parseFrameStyleLocal>;
  } | null = null;
  if (user.equippedFrameKey) {
    const eq = await prisma.equipment.findUnique({
      where: { key: user.equippedFrameKey },
      select: { key: true, name: true, tier: true, style: true },
    });
    if (eq) {
      equippedFrame = {
        key: eq.key,
        name: eq.name,
        tier: eq.tier,
        style: parseFrameStyleLocal(eq.style),
      };
    }
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    class: user.class,
    visionStatement: user.visionStatement,
    coreValues: parseList(user.coreValues),
    identityStatements: parseList(user.identityStatements),
    // Profile basics
    avatarUrl: user.avatarUrl ?? null,
    gender: user.gender ?? null,
    birthday: user.birthday ? user.birthday.toISOString() : null,
    region: user.region ?? null,
    motto: user.motto ?? null,
    onboardedAt: user.onboardedAt,
    totalXp,
    xpByArea: byArea,
    level: leveling.level,
    xpIntoLevel: leveling.xpIntoLevel,
    xpForNext: leveling.xpForNext,
    levelProgress: leveling.progress,
    currency: user.currency ?? { gold: 0, gems: 0, fate: 0 },
    equippedTitle,
    equippedFrame,
  });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  const body = await req.json();
  const data = UserUpdateSchema.parse(body);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: data.name,
      class: data.class,
      visionStatement: data.visionStatement,
      coreValues: data.coreValues ? JSON.stringify(data.coreValues) : undefined,
      identityStatements: data.identityStatements
        ? JSON.stringify(data.identityStatements)
        : undefined,
      // For nullable string fields: undefined skips, null clears, value sets.
      avatarUrl: data.avatarUrl === undefined ? undefined : data.avatarUrl,
      gender: data.gender === undefined ? undefined : data.gender,
      birthday: data.birthday === undefined
        ? undefined
        : data.birthday === null || data.birthday === ""
        ? null
        : new Date(data.birthday),
      region: data.region === undefined ? undefined : data.region,
      motto: data.motto === undefined ? undefined : data.motto,
      onboardedAt: data.onboarded ? new Date() : undefined,
    },
  });

  return NextResponse.json({ id: updated.id });
}
