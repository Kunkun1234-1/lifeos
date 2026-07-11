import { GACHA_PRESET_REWARDS } from "./gacha-presets";

const MATERIAL_LIBRARY_IMAGE_BY_NAME = new Map<string, string>(
  GACHA_PRESET_REWARDS.map((reward) => [reward.name, reward.imageUrl]),
);

export function normalizeGachaImageUrl(imageUrl: string | null | undefined, rewardName?: string | null) {
  const materialImage = rewardName ? MATERIAL_LIBRARY_IMAGE_BY_NAME.get(rewardName) : undefined;
  if (materialImage) return materialImage;
  if (!imageUrl) return imageUrl ?? null;
  return imageUrl.replace(/^\/gacha\/items\/([a-z-]+)\.svg$/, "/gacha/items/$1.png");
}
