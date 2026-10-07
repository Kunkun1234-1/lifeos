import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import legacyArtUrls from "../public/art-packs/legacy-urls.json";
import libraryManifest from "../public/art-packs/library-manifest.json";
import { legacyArtRewrites } from "../next.config";
import { ITEM_ART } from "../src/lib/art-assets";
import { isLegacyArtPath } from "../src/middleware";

const projectRoot = process.cwd();
const canonicalRoot = join(projectRoot, libraryManifest.canonicalRoot);
const unifiedMode = process.argv.includes("--unified");

const expectedItemKeys = [
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

function sha256(filePath: string) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function assertPopulatedDirectory(relativePath: string) {
  const directory = join(projectRoot, relativePath);
  assert.equal(existsSync(directory), true, `${relativePath} remains present`);
  assert.equal(statSync(directory).isDirectory(), true, `${relativePath} remains a directory`);
  assert.ok(readdirSync(directory).length > 0, `${relativePath} remains populated`);
}

assert.equal(libraryManifest.version, 1, "the art library manifest version is supported");
assert.equal(
  libraryManifest.canonicalRoot,
  "public/art-packs",
  "the manifest uses the sole canonical art root",
);
assert.equal(libraryManifest.sources.length, 177, "all 177 original art files are inventoried");
assert.equal(
  new Set(libraryManifest.sources.map(({ originalPath }) => originalPath)).size,
  177,
  "every original art path is inventoried exactly once",
);

for (const { originalPath, file, sha256: expectedSha256 } of libraryManifest.sources) {
  const canonicalFile = join(canonicalRoot, file);
  assert.equal(existsSync(canonicalFile), true, `${originalPath} has a canonical destination`);
  assert.equal(
    sha256(canonicalFile),
    expectedSha256,
    `${originalPath} canonical copy matches its recorded SHA256`,
  );
}

assert.equal(Object.keys(legacyArtUrls).length, 112, "all 112 public legacy URLs are mapped");
assert.deepEqual(
  legacyArtRewrites,
  Object.entries(legacyArtUrls).map(([source, destination]) => ({ source, destination })),
  "Next.js rewrites every legacy art URL to its canonical file",
);
for (const [legacyUrl, canonicalUrl] of Object.entries(legacyArtUrls)) {
  assert.equal(legacyUrl.startsWith("/"), true, `${legacyUrl} is an absolute public URL`);
  assert.equal(
    canonicalUrl.startsWith("/art-packs/"),
    true,
    `${legacyUrl} maps into the canonical art library`,
  );
  assert.equal(
    existsSync(join(projectRoot, "public", canonicalUrl)),
    true,
    `${legacyUrl} points to an existing canonical file`,
  );
  assert.equal(isLegacyArtPath(legacyUrl), true, `${legacyUrl} bypasses the auth gate`);
}
assert.equal(
  isLegacyArtPath("/life-game/private-or-unknown.png"),
  false,
  "the auth gate does not expose arbitrary paths under a legacy prefix",
);
assert.equal(
  isLegacyArtPath("/lifeos/private-or-unknown.png"),
  false,
  "the auth gate only exposes explicitly mapped LifeOS art",
);

assert.deepEqual(
  Object.keys(ITEM_ART),
  [...expectedItemKeys],
  "the approved 20-item art set remains unchanged",
);
for (const itemUrl of Object.values(ITEM_ART)) {
  assert.equal(
    existsSync(join(projectRoot, "public", itemUrl)),
    true,
    `${itemUrl} remains available`,
  );
}

if (unifiedMode) {
  for (const { originalPath } of libraryManifest.sources) {
    assert.equal(
      existsSync(join(projectRoot, originalPath)),
      false,
      `${originalPath} was removed after consolidation`,
    );
  }

  assert.equal(existsSync(join(projectRoot, "素材")), false, "the root 素材 directory was removed");
  assert.equal(
    existsSync(join(projectRoot, "life_manager_asset_sheet_crops")),
    false,
    "the root crop directory was removed",
  );
  assertPopulatedDirectory("public/gacha/audio");
  assertPopulatedDirectory("public/uploads");
}

console.log(`art library tests passed (${unifiedMode ? "unified" : "baseline"} mode)`);
