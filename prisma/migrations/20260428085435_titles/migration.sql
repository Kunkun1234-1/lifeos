-- AlterTable
ALTER TABLE "User" ADD COLUMN "equippedTitleKey" TEXT;

-- CreateTable
CREATE TABLE "Title" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '🏷️',
    "tier" TEXT NOT NULL DEFAULT 'bronze',
    "sourceAchievementKey" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "UserTitle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "titleKey" TEXT NOT NULL,
    "unlockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserTitle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserTitle_titleKey_fkey" FOREIGN KEY ("titleKey") REFERENCES "Title" ("key") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Title_key_key" ON "Title"("key");

-- CreateIndex
CREATE INDEX "Title_sourceAchievementKey_idx" ON "Title"("sourceAchievementKey");

-- CreateIndex
CREATE INDEX "Title_tier_idx" ON "Title"("tier");

-- CreateIndex
CREATE INDEX "UserTitle_userId_unlockedAt_idx" ON "UserTitle"("userId", "unlockedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserTitle_userId_titleKey_key" ON "UserTitle"("userId", "titleKey");
