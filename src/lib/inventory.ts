import { normalizeGachaImageUrl } from "./gacha-assets";
import type {
  InventoryRewardInstanceDTO,
  InventoryRewardSource,
  InventoryRewardStatus,
  RewardItemDTO,
} from "./types";

const REWARD_TIERS = new Set(["common", "rare", "epic", "legendary"]);

type RewardRecord = {
  id: string;
  name: string;
  description: string | null;
  emoji: string;
  imageUrl: string | null;
  tier: string;
  costGold: number;
  costGems: number;
  inGachaPool: boolean;
  weight: number;
  redeemedCount: number;
  archived: boolean;
};

export type InventoryRedemptionRecord = {
  id: string;
  status: string;
  source: string;
  costGold: number;
  costGems: number;
  redeemedAt: Date;
  usedAt: Date | null;
  discardedAt: Date | null;
  note: string | null;
  reward: RewardRecord;
};

function rewardTier(value: string): RewardItemDTO["tier"] {
  return REWARD_TIERS.has(value) ? (value as RewardItemDTO["tier"]) : "common";
}

function rewardStatus(value: string): InventoryRewardStatus {
  if (value === "used" || value === "discarded") return value;
  return "available";
}

function rewardSource(value: string): InventoryRewardSource {
  return value === "gacha" ? "gacha" : "store";
}

export function serializeInventoryReward(
  redemption: InventoryRedemptionRecord,
): InventoryRewardInstanceDTO {
  return {
    id: redemption.id,
    status: rewardStatus(redemption.status),
    source: rewardSource(redemption.source),
    costGold: redemption.costGold,
    costGems: redemption.costGems,
    redeemedAt: redemption.redeemedAt.toISOString(),
    usedAt: redemption.usedAt?.toISOString() ?? null,
    discardedAt: redemption.discardedAt?.toISOString() ?? null,
    note: redemption.note,
    reward: {
      id: redemption.reward.id,
      name: redemption.reward.name,
      description: redemption.reward.description,
      emoji: redemption.reward.emoji,
      imageUrl: normalizeGachaImageUrl(redemption.reward.imageUrl),
      tier: rewardTier(redemption.reward.tier),
      costGold: redemption.reward.costGold,
      costGems: redemption.reward.costGems,
      inGachaPool: redemption.reward.inGachaPool,
      weight: redemption.reward.weight,
      redeemedCount: redemption.reward.redeemedCount,
      archived: redemption.reward.archived,
    },
  };
}
