export function normalizeGachaImageUrl(imageUrl: string | null | undefined) {
  if (!imageUrl) return imageUrl ?? null;
  return imageUrl.replace(/^\/gacha\/items\/([a-z-]+)\.svg$/, "/gacha/items/$1.png");
}
