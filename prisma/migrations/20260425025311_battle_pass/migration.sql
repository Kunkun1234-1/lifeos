-- CreateTable
CREATE TABLE "BattlePass" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "weekStart" TEXT NOT NULL,
    "weekEnd" TEXT NOT NULL,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "missions" TEXT NOT NULL DEFAULT '[]',
    "claimedLevels" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BattlePass_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BattlePass_userId_weekStart_idx" ON "BattlePass"("userId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "BattlePass_userId_weekStart_key" ON "BattlePass"("userId", "weekStart");
