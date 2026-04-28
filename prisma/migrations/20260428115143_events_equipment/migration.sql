-- AlterTable
ALTER TABLE "User" ADD COLUMN "equippedFrameKey" TEXT;

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '🎉',
    "themeColor" TEXT NOT NULL DEFAULT '#b68838',
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "missions" TEXT NOT NULL DEFAULT '[]',
    "bonusXp" INTEGER NOT NULL DEFAULT 0,
    "bonusGold" INTEGER NOT NULL DEFAULT 0,
    "bonusGems" INTEGER NOT NULL DEFAULT 0,
    "bonusFate" INTEGER NOT NULL DEFAULT 0,
    "bonusEquipmentKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserEventClaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "missionKey" TEXT NOT NULL,
    "snapshot" INTEGER NOT NULL DEFAULT 0,
    "claimedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserEventClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserEventClaim_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '🖼️',
    "slot" TEXT NOT NULL DEFAULT 'frame',
    "tier" TEXT NOT NULL DEFAULT 'common',
    "source" TEXT NOT NULL DEFAULT 'seed',
    "sourceKey" TEXT,
    "style" TEXT NOT NULL DEFAULT '{}'
);

-- CreateTable
CREATE TABLE "UserEquipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "equipmentKey" TEXT NOT NULL,
    "unlockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserEquipment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserEquipment_equipmentKey_fkey" FOREIGN KEY ("equipmentKey") REFERENCES "Equipment" ("key") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_key_key" ON "Event"("key");

-- CreateIndex
CREATE INDEX "Event_startsAt_endsAt_idx" ON "Event"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "UserEventClaim_userId_eventId_idx" ON "UserEventClaim"("userId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "UserEventClaim_userId_eventId_missionKey_key" ON "UserEventClaim"("userId", "eventId", "missionKey");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_key_key" ON "Equipment"("key");

-- CreateIndex
CREATE INDEX "Equipment_slot_tier_idx" ON "Equipment"("slot", "tier");

-- CreateIndex
CREATE INDEX "Equipment_sourceKey_idx" ON "Equipment"("sourceKey");

-- CreateIndex
CREATE INDEX "UserEquipment_userId_unlockedAt_idx" ON "UserEquipment"("userId", "unlockedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserEquipment_userId_equipmentKey_key" ON "UserEquipment"("userId", "equipmentKey");
