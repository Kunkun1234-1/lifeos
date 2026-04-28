-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "areaId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'okr',
    "objective" TEXT NOT NULL,
    "notes" TEXT,
    "timeframe" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "confidence" INTEGER NOT NULL DEFAULT 5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Goal_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KeyResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goalId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT,
    "target" REAL NOT NULL,
    "current" REAL NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KeyResult_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "areaId" TEXT,
    "goalId" TEXT,
    "title" TEXT NOT NULL,
    "deliverable" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startDate" DATETIME,
    "deadline" DATETIME,
    "completedAt" DATETIME,
    "xpReward" INTEGER NOT NULL DEFAULT 100,
    "goldReward" INTEGER NOT NULL DEFAULT 40,
    "gemsReward" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Project_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RewardItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "emoji" TEXT NOT NULL DEFAULT '🎁',
    "tier" TEXT NOT NULL DEFAULT 'common',
    "costGold" INTEGER NOT NULL DEFAULT 0,
    "costGems" INTEGER NOT NULL DEFAULT 0,
    "inGachaPool" BOOLEAN NOT NULL DEFAULT true,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "redeemedCount" INTEGER NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RewardItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RewardRedemption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "costGold" INTEGER NOT NULL DEFAULT 0,
    "costGems" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'store',
    "redeemedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RewardRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RewardRedemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "RewardItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '🏆',
    "tier" TEXT NOT NULL DEFAULT 'bronze',
    "category" TEXT NOT NULL DEFAULT 'milestone',
    "trigger" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "rewardGold" INTEGER NOT NULL DEFAULT 0,
    "rewardGems" INTEGER NOT NULL DEFAULT 0,
    "rewardFate" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "AchievementUnlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AchievementUnlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AchievementUnlock_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GachaPull" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "rewardId" TEXT,
    "tier" TEXT NOT NULL,
    "fateSpent" INTEGER NOT NULL DEFAULT 1,
    "pity" TEXT,
    "pulledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GachaPull_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GachaPull_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "RewardItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StreakFreeze" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "count" INTEGER NOT NULL DEFAULT 0,
    "totalUsed" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StreakFreeze_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "areaId" TEXT,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "priority" INTEGER NOT NULL DEFAULT 2,
    "dueDate" DATETIME,
    "xpReward" INTEGER NOT NULL DEFAULT 10,
    "goldReward" INTEGER NOT NULL DEFAULT 5,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("areaId", "completedAt", "createdAt", "dueDate", "goldReward", "id", "notes", "priority", "status", "title", "updatedAt", "userId", "xpReward") SELECT "areaId", "completedAt", "createdAt", "dueDate", "goldReward", "id", "notes", "priority", "status", "title", "updatedAt", "userId", "xpReward" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE INDEX "Task_userId_status_idx" ON "Task"("userId", "status");
CREATE INDEX "Task_userId_dueDate_idx" ON "Task"("userId", "dueDate");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "name" TEXT NOT NULL DEFAULT 'Player One',
    "class" TEXT NOT NULL DEFAULT 'Scholar',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Shanghai',
    "visionStatement" TEXT,
    "coreValues" TEXT NOT NULL DEFAULT '[]',
    "identityStatements" TEXT NOT NULL DEFAULT '[]',
    "preferences" TEXT NOT NULL DEFAULT '{}',
    "onboardedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "pullsSinceRare" INTEGER NOT NULL DEFAULT 0,
    "pullsSinceEpic" INTEGER NOT NULL DEFAULT 0,
    "totalPulls" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_User" ("class", "coreValues", "createdAt", "email", "id", "identityStatements", "name", "onboardedAt", "preferences", "timezone", "updatedAt", "visionStatement") SELECT "class", "coreValues", "createdAt", "email", "id", "identityStatements", "name", "onboardedAt", "preferences", "timezone", "updatedAt", "visionStatement" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Goal_userId_status_idx" ON "Goal"("userId", "status");

-- CreateIndex
CREATE INDEX "Goal_userId_timeframe_idx" ON "Goal"("userId", "timeframe");

-- CreateIndex
CREATE INDEX "KeyResult_goalId_idx" ON "KeyResult"("goalId");

-- CreateIndex
CREATE INDEX "Project_userId_status_idx" ON "Project"("userId", "status");

-- CreateIndex
CREATE INDEX "RewardItem_userId_tier_idx" ON "RewardItem"("userId", "tier");

-- CreateIndex
CREATE INDEX "RewardRedemption_userId_redeemedAt_idx" ON "RewardRedemption"("userId", "redeemedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_key_key" ON "Achievement"("key");

-- CreateIndex
CREATE INDEX "Achievement_category_idx" ON "Achievement"("category");

-- CreateIndex
CREATE INDEX "AchievementUnlock_userId_unlockedAt_idx" ON "AchievementUnlock"("userId", "unlockedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AchievementUnlock_userId_achievementId_key" ON "AchievementUnlock"("userId", "achievementId");

-- CreateIndex
CREATE INDEX "GachaPull_userId_pulledAt_idx" ON "GachaPull"("userId", "pulledAt");
