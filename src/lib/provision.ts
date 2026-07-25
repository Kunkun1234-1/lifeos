import { prisma } from "./prisma";
import { GACHA_PRESET_REWARDS } from "./gacha-presets";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Local/dev starters are intentionally generous so shop, gacha, and reward
 * flows can be exercised without grinding. Production stays lean.
 * (Gacha is 160 gold/pull; store presets go up to ~5000 gold.)
 */
const PROD_STARTER = { gold: 100, gems: 0, fate: 5 } as const;
const DEV_STARTER = { gold: 50_000, gems: 500, fate: 99 } as const;

/**
 * Initialize per-user defaults on first login:
 * - Currency record (gold/gems/fate counters)
 * - 6 default Life Areas (mapped to STR/INT/CHA/WIS/CRE/GOLD attributes)
 * - Default store/gacha reward presets (all four wish tiers)
 *
 * Idempotent — safe to call on every session bootstrap; uses upserts.
 *
 * Custom Achievements/Events/Principles are NOT seeded — users discover those
 * via system globals + create their own. Knowledge-base root pages ARE seeded
 * once (Inbox + Resources) so the Notion-style workspace is never empty.
 */
export async function provisionUserDefaults(userId: string): Promise<void> {
  const starter = isDev ? DEV_STARTER : PROD_STARTER;

  // Prefer reads before writes here: this helper can run during session
  // bootstrap, and an empty upsert still costs a remote DB write.
  const [currency, areaCount, rewardCount, noteCount] = await Promise.all([
    prisma.currency.findUnique({
      where: { userId },
      select: { userId: true },
    }),
    prisma.area.count({ where: { userId } }),
    prisma.rewardItem.count({ where: { userId } }),
    prisma.note.count({ where: { userId } }),
  ]);

  // 1) Currency
  if (!currency) {
    await prisma.currency.upsert({
      where: { userId },
      create: { userId, ...starter },
      update: {},
    });
  }

  // 2) Life Areas — only seed if user has zero areas yet.
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

  // 3) Store / wish pool presets — needed so gacha has all four tiers.
  if (rewardCount === 0) {
    await prisma.rewardItem.createMany({
      data: GACHA_PRESET_REWARDS.map((reward) => ({ ...reward, userId })),
    });
  }

  // 4) Knowledge-base default root pages (only when the user has zero notes).
  if (noteCount === 0) {
    try {
      await seedDefaultNotes(userId);
    } catch (error) {
      // Note schema/client drift must not break goals/tasks/assets bootstrap.
      console.error("[provision] failed to seed default notes", error);
    }
  }
}

async function seedDefaultNotes(userId: string) {
  const base = [
    {
      userId,
      title: "收件箱",
      body: "快速捕捉灵感、摘录与待整理材料。整理后可拖入资源库或项目下。",
      kind: "note",
      position: 0,
      tags: ",inbox,",
    },
    {
      userId,
      title: "资源库",
      body: "长期有用的参考资料、书摘与链接。按主题建子页面，保持可检索。",
      kind: "note",
      position: 1,
      tags: ",resources,",
    },
  ] as const;

  try {
    await prisma.note.createMany({
      data: [
        { ...base[0], icon: "📥" },
        { ...base[1], icon: "📚" },
      ],
    });
  } catch {
    // Older Prisma clients / DBs may not know Note.icon yet.
    await prisma.note.createMany({
      data: [...base],
    });
  }
}

/**
 * Top up the local Dev account to the generous floor.
 * Called from Dev Login only — never from normal page/API bootstrap — so
 * mid-session spending (e.g. testing insufficient funds) is preserved.
 */
export async function ensureDevTestCurrency(userId: string): Promise<void> {
  if (!isDev) return;

  const currency = await prisma.currency.findUnique({
    where: { userId },
    select: { gold: true, gems: true, fate: true },
  });

  if (!currency) {
    await prisma.currency.create({
      data: { userId, ...DEV_STARTER },
    });
    return;
  }

  const needsTopUp =
    currency.gold < DEV_STARTER.gold ||
    currency.gems < DEV_STARTER.gems ||
    currency.fate < DEV_STARTER.fate;

  if (!needsTopUp) return;

  await prisma.currency.update({
    where: { userId },
    data: {
      gold: Math.max(currency.gold, DEV_STARTER.gold),
      gems: Math.max(currency.gems, DEV_STARTER.gems),
      fate: Math.max(currency.fate, DEV_STARTER.fate),
    },
  });
}
