export const ART_PACK_ROOT = "/art-packs/anime-rpg-v1";

export const ITEM_ART = {
  gold: `${ART_PACK_ROOT}/items/gold.webp`,
  gems: `${ART_PACK_ROOT}/items/gems.webp`,
  fate: `${ART_PACK_ROOT}/items/fate.webp`,
  freeze: `${ART_PACK_ROOT}/items/freeze.webp`,
  "moon-tea": `${ART_PACK_ROOT}/items/moon-tea.webp`,
  "starlit-treat": `${ART_PACK_ROOT}/items/starlit-treat.webp`,
  "free-time-ticket": `${ART_PACK_ROOT}/items/free-time-ticket.webp`,
  "dream-rest": `${ART_PACK_ROOT}/items/dream-rest.webp`,
  "azure-book": `${ART_PACK_ROOT}/items/azure-book.webp`,
  "sakura-voucher": `${ART_PACK_ROOT}/items/sakura-voucher.webp`,
  "cloud-healing": `${ART_PACK_ROOT}/items/cloud-healing.webp`,
  "crystal-tool": `${ART_PACK_ROOT}/items/crystal-tool.webp`,
  "horizon-map": `${ART_PACK_ROOT}/items/horizon-map.webp`,
  "artisan-gift": `${ART_PACK_ROOT}/items/artisan-gift.webp`,
  "aurora-workshop": `${ART_PACK_ROOT}/items/aurora-workshop.webp`,
  "astral-pass": `${ART_PACK_ROOT}/items/astral-pass.webp`,
  frame: `${ART_PACK_ROOT}/items/frame.webp`,
  crown: `${ART_PACK_ROOT}/items/crown.webp`,
  book: `${ART_PACK_ROOT}/items/book.webp`,
  gift: `${ART_PACK_ROOT}/items/gift.webp`,
} as const;

export const FEATURE_ART = {
  tasks: `${ART_PACK_ROOT}/feature-art/tasks.webp`,
  habits: `${ART_PACK_ROOT}/feature-art/habits.webp`,
  routines: `${ART_PACK_ROOT}/feature-art/routines.webp`,
  review: ITEM_ART.book,
  goals: `${ART_PACK_ROOT}/feature-art/goals.webp`,
  projects: ITEM_ART["aurora-workshop"],
  strategy: ITEM_ART["horizon-map"],
  notes: ITEM_ART["azure-book"],
  analytics: `${ART_PACK_ROOT}/feature-art/analytics.webp`,
  rewards: ITEM_ART["artisan-gift"],
  gacha: ITEM_ART.fate,
  inventory: `${ART_PACK_ROOT}/feature-art/inventory.webp`,
} as const;

export type ItemArtKey = keyof typeof ITEM_ART;

const CANONICAL_ITEM_ART = new Set<string>(Object.values(ITEM_ART));

const LEGACY_ITEM_ART_BY_BASENAME: Record<string, ItemArtKey> = {
  "resource-gold.png": "gold",
  "resource-gems.png": "gems",
  "resource-fate.png": "fate",
  "resource-freeze.png": "freeze",
  "item-frame.png": "frame",
  "item-crown.png": "crown",
  "item-book.png": "book",
  "item-gift.png": "gift",
  "moon-tea.png": "moon-tea",
  "moon-tea.svg": "moon-tea",
  "starlit-macaron.png": "starlit-treat",
  "starlit-macaron.svg": "starlit-treat",
  "glider-ticket.png": "free-time-ticket",
  "glider-ticket.svg": "free-time-ticket",
  "dream-candle.png": "dream-rest",
  "dream-candle.svg": "dream-rest",
  "azure-book.png": "azure-book",
  "azure-book.svg": "azure-book",
  "sakura-meal.png": "sakura-voucher",
  "sakura-meal.svg": "sakura-voucher",
  "cloud-massage.png": "cloud-healing",
  "cloud-massage.svg": "cloud-healing",
  "crystal-pen.png": "crystal-tool",
  "crystal-pen.svg": "crystal-tool",
  "horizon-map.png": "horizon-map",
  "horizon-map.svg": "horizon-map",
  "artisan-box.png": "artisan-gift",
  "artisan-box.svg": "artisan-gift",
  "aurora-keyboard.png": "aurora-workshop",
  "aurora-keyboard.svg": "aurora-workshop",
  "astral-passport.png": "astral-pass",
  "astral-passport.svg": "astral-pass",
};

for (const key of Object.keys(ITEM_ART) as ItemArtKey[]) {
  LEGACY_ITEM_ART_BY_BASENAME[`fantasy-${key}.webp`] = key;
  LEGACY_ITEM_ART_BY_BASENAME[`material-${key}.png`] = key;
  LEGACY_ITEM_ART_BY_BASENAME[`material-${key}.svg`] = key;
}

const LEGACY_ITEM_ROOTS = ["/life-game/items/", "/gacha/items/"];

export function isArtPackItemUrl(imageUrl: string | null | undefined) {
  return Boolean(imageUrl && CANONICAL_ITEM_ART.has(imageUrl));
}

export function normalizeBuiltInItemArtUrl(imageUrl: string | null | undefined) {
  if (!imageUrl) return imageUrl ?? null;
  if (CANONICAL_ITEM_ART.has(imageUrl)) return imageUrl;

  const itemRoot = LEGACY_ITEM_ROOTS.find((root) => imageUrl.startsWith(root));
  if (!itemRoot) return imageUrl;

  const pathname = imageUrl.split(/[?#]/, 1)[0];
  const basename = pathname.slice(itemRoot.length);
  const artKey = LEGACY_ITEM_ART_BY_BASENAME[basename];
  return artKey ? ITEM_ART[artKey] : imageUrl;
}
