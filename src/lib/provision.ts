import { prisma } from "./prisma";

/**
 * Initialize per-user defaults on first login:
 * - Currency record (gold/gems/fate counters)
 * - 6 default Life Areas (mapped to STR/INT/CHA/WIS/CRE/GOLD attributes)
 *
 * Idempotent — safe to call on every session bootstrap; uses upserts.
 *
 * Custom (user-scoped) Achievements/Events/Notes/Principles are NOT seeded —
 * users discover those via system globals + create their own.
 */
export async function provisionUserDefaults(userId: string): Promise<void> {
  // 1) Currency
  await prisma.currency.upsert({
    where: { userId },
    create: { userId, gold: 100, gems: 0, fate: 5 },
    update: {},
  });

  // 2) Life Areas — only seed if user has zero areas yet.
  const areaCount = await prisma.area.count({ where: { userId } });
  if (areaCount === 0) {
    const defaults = [
      { name: "Health",        icon: "💪", color: "#c47a4f", attributeKey: "STR", weight: 1, order: 1 },
      { name: "Learning",      icon: "📚", color: "#7d6bcf", attributeKey: "INT", weight: 1, order: 2 },
      { name: "Relationships", icon: "❤️", color: "#d44d6f", attributeKey: "CHA", weight: 1, order: 3 },
      { name: "Wellbeing",     icon: "🧘", color: "#3a8a8a", attributeKey: "WIS", weight: 1, order: 4 },
      { name: "Creative",      icon: "🎨", color: "#9b6bc1", attributeKey: "CRE", weight: 1, order: 5 },
      { name: "Finance",       icon: "💰", color: "#b68838", attributeKey: "GOLD", weight: 1, order: 6 },
    ];
    await prisma.area.createMany({
      data: defaults.map((a) => ({ ...a, userId })),
    });
  }
}
