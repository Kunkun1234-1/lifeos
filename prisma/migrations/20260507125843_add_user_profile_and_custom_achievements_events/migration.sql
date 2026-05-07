-- AlterTable
ALTER TABLE "RewardItem" ADD COLUMN "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "birthday" DATETIME;
ALTER TABLE "User" ADD COLUMN "gender" TEXT;
ALTER TABLE "User" ADD COLUMN "motto" TEXT;
ALTER TABLE "User" ADD COLUMN "region" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Achievement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '🏆',
    "imageUrl" TEXT,
    "tier" TEXT NOT NULL DEFAULT 'bronze',
    "category" TEXT NOT NULL DEFAULT 'milestone',
    "ownerUserId" TEXT,
    "trigger" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "rewardGold" INTEGER NOT NULL DEFAULT 0,
    "rewardGems" INTEGER NOT NULL DEFAULT 0,
    "rewardFate" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Achievement_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Achievement" ("category", "description", "emoji", "hidden", "id", "key", "name", "rewardFate", "rewardGems", "rewardGold", "tier", "trigger") SELECT "category", "description", "emoji", "hidden", "id", "key", "name", "rewardFate", "rewardGems", "rewardGold", "tier", "trigger" FROM "Achievement";
DROP TABLE "Achievement";
ALTER TABLE "new_Achievement" RENAME TO "Achievement";
CREATE UNIQUE INDEX "Achievement_key_key" ON "Achievement"("key");
CREATE INDEX "Achievement_category_idx" ON "Achievement"("category");
CREATE INDEX "Achievement_ownerUserId_idx" ON "Achievement"("ownerUserId");
CREATE TABLE "new_Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '🎉',
    "imageUrl" TEXT,
    "themeColor" TEXT NOT NULL DEFAULT '#b68838',
    "ownerUserId" TEXT,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "missions" TEXT NOT NULL DEFAULT '[]',
    "bonusXp" INTEGER NOT NULL DEFAULT 0,
    "bonusGold" INTEGER NOT NULL DEFAULT 0,
    "bonusGems" INTEGER NOT NULL DEFAULT 0,
    "bonusFate" INTEGER NOT NULL DEFAULT 0,
    "bonusEquipmentKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Event" ("bonusEquipmentKey", "bonusFate", "bonusGems", "bonusGold", "bonusXp", "createdAt", "description", "emoji", "endsAt", "id", "key", "missions", "name", "startsAt", "themeColor", "updatedAt") SELECT "bonusEquipmentKey", "bonusFate", "bonusGems", "bonusGold", "bonusXp", "createdAt", "description", "emoji", "endsAt", "id", "key", "missions", "name", "startsAt", "themeColor", "updatedAt" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
CREATE UNIQUE INDEX "Event_key_key" ON "Event"("key");
CREATE INDEX "Event_startsAt_endsAt_idx" ON "Event"("startsAt", "endsAt");
CREATE INDEX "Event_ownerUserId_idx" ON "Event"("ownerUserId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
