// LifeOS gamification math — XP curve, levels, attribute routing.
// Per design doc §4.1: next_level_xp = 100 * level^1.5 (super-linear, avoids linearity).

export const ATTRIBUTE_KEYS = ["STR", "INT", "CHA", "WIS", "CRE", "GOLD"] as const;
export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number];

export const ATTRIBUTE_LABEL: Record<AttributeKey, string> = {
  STR: "Strength",
  INT: "Intellect",
  CHA: "Charisma",
  WIS: "Wisdom",
  CRE: "Creativity",
  GOLD: "Wealth",
};

export const ATTRIBUTE_EMOJI: Record<AttributeKey, string> = {
  STR: "💪",
  INT: "🧠",
  CHA: "❤️",
  WIS: "🧘",
  CRE: "🎨",
  GOLD: "💰",
};

/** XP required to go from level L to L+1. */
export function xpToNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(Math.max(1, level), 1.5));
}

/** Given total XP, return { level, xpIntoLevel, xpForNext, progress 0..1 }. */
export function deriveLevel(totalXp: number): {
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
  progress: number;
} {
  let level = 1;
  let remaining = Math.max(0, totalXp);
  let needed = xpToNextLevel(level);
  while (remaining >= needed) {
    remaining -= needed;
    level += 1;
    needed = xpToNextLevel(level);
  }
  return {
    level,
    xpIntoLevel: remaining,
    xpForNext: needed,
    progress: needed === 0 ? 0 : remaining / needed,
  };
}

/**
 * Split a reward across the user's XP ledger and the attribute XP of an Area.
 * If no areaKey (task without area), it still accrues to total XP but no attribute bonus.
 */
export type XpGain = {
  total: number;
  areaKey: AttributeKey | null;
};

export function resolveAreaKey(raw: string | null | undefined): AttributeKey | null {
  if (!raw) return null;
  return (ATTRIBUTE_KEYS as readonly string[]).includes(raw) ? (raw as AttributeKey) : null;
}
