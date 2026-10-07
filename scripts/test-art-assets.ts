import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  ART_PACK_ROOT,
  ITEM_ART,
  normalizeBuiltInItemArtUrl,
} from "../src/lib/art-assets";
import { normalizeGachaImageUrl } from "../src/lib/gacha-assets";

const expectedKeys = [
  "gold",
  "gems",
  "fate",
  "freeze",
  "moon-tea",
  "starlit-treat",
  "free-time-ticket",
  "dream-rest",
  "azure-book",
  "sakura-voucher",
  "cloud-healing",
  "crystal-tool",
  "horizon-map",
  "artisan-gift",
  "aurora-workshop",
  "astral-pass",
  "frame",
  "crown",
  "book",
  "gift",
] as const;

assert.deepEqual(Object.keys(ITEM_ART), [...expectedKeys], "the art pack exposes exactly 20 item icons");

for (const key of expectedKeys) {
  const publicUrl = `${ART_PACK_ROOT}/items/${key}.webp`;
  assert.equal(ITEM_ART[key], publicUrl, `${key} uses its canonical pack URL`);
  assert.equal(
    existsSync(join(process.cwd(), "public", publicUrl)),
    true,
    `${key}.webp exists in the public art pack`,
  );
}

assert.equal(
  normalizeBuiltInItemArtUrl("/life-game/items/fantasy-gold.webp"),
  ITEM_ART.gold,
  "persisted fantasy resource URLs migrate to the art pack",
);
assert.equal(
  normalizeBuiltInItemArtUrl("/life-game/items/item-frame.png"),
  ITEM_ART.frame,
  "persisted fallback item URLs migrate to the art pack",
);
assert.equal(
  normalizeBuiltInItemArtUrl("/gacha/items/material-starlit-treat.png"),
  ITEM_ART["starlit-treat"],
  "persisted material URLs migrate to the art pack",
);
assert.equal(
  normalizeBuiltInItemArtUrl("/gacha/items/dream-candle.svg"),
  ITEM_ART["dream-rest"],
  "old subject variants migrate to the matching icon",
);
assert.equal(
  normalizeBuiltInItemArtUrl("/uploads/rewards/custom.webp"),
  "/uploads/rewards/custom.webp",
  "uploaded reward art stays untouched",
);
assert.equal(
  normalizeBuiltInItemArtUrl("https://images.example.com/custom.webp"),
  "https://images.example.com/custom.webp",
  "external reward art stays untouched",
);
assert.equal(normalizeBuiltInItemArtUrl(null), null, "null image URLs stay null");
assert.equal(normalizeBuiltInItemArtUrl(undefined), null, "missing image URLs normalize to null");
assert.equal(
  normalizeGachaImageUrl("/uploads/rewards/old-custom.webp", "月露茶券"),
  ITEM_ART["moon-tea"],
  "known preset names override persisted image URLs",
);
assert.equal(
  normalizeGachaImageUrl("/uploads/rewards/custom.webp", "自定义奖励"),
  "/uploads/rewards/custom.webp",
  "custom reward names keep custom image URLs",
);

console.log("art asset tests passed");
