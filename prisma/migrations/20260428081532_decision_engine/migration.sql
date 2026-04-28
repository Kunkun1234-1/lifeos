-- CreateTable
CREATE TABLE "Principle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "source" TEXT,
    "category" TEXT NOT NULL DEFAULT 'life',
    "emoji" TEXT NOT NULL DEFAULT '📜',
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Principle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "areaId" TEXT,
    "title" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "stakes" TEXT NOT NULL DEFAULT 'medium',
    "options" TEXT NOT NULL DEFAULT '[]',
    "chosenIndex" INTEGER,
    "preMortem" TEXT,
    "tenTenTen" TEXT,
    "decidedAt" DATETIME,
    "reviewDueAt" DATETIME,
    "outcome" TEXT,
    "lessons" TEXT,
    "rating" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "reviewedAt" DATETIME,
    CONSTRAINT "Decision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Decision_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DecisionPrinciple" (
    "decisionId" TEXT NOT NULL,
    "principleId" TEXT NOT NULL,

    PRIMARY KEY ("decisionId", "principleId"),
    CONSTRAINT "DecisionPrinciple_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DecisionPrinciple_principleId_fkey" FOREIGN KEY ("principleId") REFERENCES "Principle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Principle_userId_archived_idx" ON "Principle"("userId", "archived");

-- CreateIndex
CREATE INDEX "Decision_userId_status_idx" ON "Decision"("userId", "status");

-- CreateIndex
CREATE INDEX "Decision_userId_reviewDueAt_idx" ON "Decision"("userId", "reviewDueAt");

-- CreateIndex
CREATE INDEX "DecisionPrinciple_principleId_idx" ON "DecisionPrinciple"("principleId");
