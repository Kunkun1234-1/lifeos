import assert from "node:assert/strict";
import {
  FIVE_STAR_HARD_PITY,
  FIVE_STAR_RATE,
  FOUR_STAR_PITY,
  currentFiveStarRate,
  rollGachaTier,
} from "../src/lib/gacha-rules";
import { normalizeGachaImageUrl } from "../src/lib/gacha-assets";
import { RewardItemSchema } from "../src/lib/validators";

const baseReward = {
  name: "专注半日券",
  description: null,
  emoji: "🎁",
  imageUrl: null,
  tier: "common" as const,
  category: "virtual" as const,
  costMoneyCents: 0,
  costGold: 80,
  inGachaPool: true,
  weight: 1,
};

assert.equal(RewardItemSchema.parse(baseReward).costGold, 80);
assert.equal(
  RewardItemSchema.safeParse({ ...baseReward, costGold: 0 }).success,
  false,
  "free products must be rejected",
);
assert.equal(
  RewardItemSchema.safeParse({
    ...baseReward,
    category: "physical_small",
    costMoneyCents: 50_000,
  }).success,
  false,
  "small physical products must stay below CNY 500",
);
assert.equal(
  RewardItemSchema.safeParse({
    ...baseReward,
    category: "physical_large",
    costMoneyCents: 49_999,
  }).success,
  false,
  "large physical products start at CNY 500",
);

assert.equal(currentFiveStarRate(0), FIVE_STAR_RATE);
assert.equal(currentFiveStarRate(FIVE_STAR_HARD_PITY - 1), 1);
assert.equal(
  rollGachaTier(FOUR_STAR_PITY - 1, 0, sequence([0.9, 0.9])),
  "rare",
  "the tenth non-legendary pull must be four-star or above",
);
assert.equal(
  rollGachaTier(0, FIVE_STAR_HARD_PITY - 1, sequence([0.999])),
  "legendary",
  "the ninetieth pull must be legendary",
);
assert.equal(
  rollGachaTier(0, 0, sequence([0.0061, 0.9])),
  "rare",
  "the four-star base band starts immediately after the five-star band",
);
assert.equal(
  normalizeGachaImageUrl("/legacy/custom.png", "月露茶券"),
  "/gacha/items/material-moon-tea.png",
  "default rewards must prefer the curated material library",
);
assert.equal(
  normalizeGachaImageUrl("/uploads/custom.png", "自定义奖励"),
  "/uploads/custom.png",
  "custom rewards keep their uploaded image when the material library has no match",
);

console.log("store/wish rule tests passed");

function sequence(values: number[]) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)] ?? 0;
}
