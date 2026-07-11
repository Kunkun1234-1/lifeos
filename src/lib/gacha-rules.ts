export const GACHA_RULES_VERSION = "wish-v1-money-gold";
export const GOLD_PER_PULL = 160;
export const FOUR_STAR_RATE = 0.051;
export const FIVE_STAR_RATE = 0.006;
export const FOUR_STAR_PITY = 10;
export const FIVE_STAR_SOFT_PITY = 74;
export const FIVE_STAR_HARD_PITY = 90;

export const GACHA_TIERS = ["common", "rare", "epic", "legendary"] as const;
export type GachaTier = (typeof GACHA_TIERS)[number];

export function currentFiveStarRate(pullsSinceFiveStar: number) {
  const nextPull = pullsSinceFiveStar + 1;
  if (nextPull >= FIVE_STAR_HARD_PITY) return 1;
  if (nextPull < FIVE_STAR_SOFT_PITY) return FIVE_STAR_RATE;
  return Math.min(
    1,
    FIVE_STAR_RATE + (nextPull - FIVE_STAR_SOFT_PITY + 1) * 0.06,
  );
}

function rollFourStarTier(random: () => number): GachaTier {
  return random() < 0.18 ? "epic" : "rare";
}

export function rollGachaTier(
  pullsSinceFourStar: number,
  pullsSinceFiveStar: number,
  random: () => number = Math.random,
): GachaTier {
  const fiveStarRate = currentFiveStarRate(pullsSinceFiveStar);
  const roll = random();
  if (roll < fiveStarRate) return "legendary";
  if (pullsSinceFourStar + 1 >= FOUR_STAR_PITY) return rollFourStarTier(random);
  if (roll < Math.min(1, fiveStarRate + FOUR_STAR_RATE)) return rollFourStarTier(random);
  return "common";
}
