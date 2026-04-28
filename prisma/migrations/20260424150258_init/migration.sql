-- CreateTable
CREATE TABLE "User" (
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
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '⭐',
    "color" TEXT NOT NULL DEFAULT '#8B5CF6',
    "weight" REAL NOT NULL DEFAULT 1.0,
    "healthScore" INTEGER NOT NULL DEFAULT 50,
    "attributeKey" TEXT NOT NULL DEFAULT 'INT',
    "attributeXp" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Area_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "areaId" TEXT,
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
    CONSTRAINT "Task_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Habit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "areaId" TEXT,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'positive',
    "positiveCount" INTEGER NOT NULL DEFAULT 0,
    "negativeCount" INTEGER NOT NULL DEFAULT 0,
    "xpPerTick" INTEGER NOT NULL DEFAULT 5,
    "goldPerTick" INTEGER NOT NULL DEFAULT 2,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Habit_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HabitTick" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "habitId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "xpDelta" INTEGER NOT NULL,
    "goldDelta" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HabitTick_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Routine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "areaId" TEXT,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "daysOfWeek" TEXT NOT NULL DEFAULT '[0,1,2,3,4,5,6]',
    "xpReward" INTEGER NOT NULL DEFAULT 15,
    "goldReward" INTEGER NOT NULL DEFAULT 8,
    "streakCurrent" INTEGER NOT NULL DEFAULT 0,
    "streakBest" INTEGER NOT NULL DEFAULT 0,
    "freezesAvailable" INTEGER NOT NULL DEFAULT 2,
    "lastCompletedDate" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Routine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Routine_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoutineCompletion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "routineId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoutineCompletion_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "XpLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT,
    "areaKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "XpLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Currency" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "gems" INTEGER NOT NULL DEFAULT 0,
    "fate" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Currency_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyCommission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "items" TEXT NOT NULL,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "bonusClaimed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyCommission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "content" TEXT NOT NULL,
    "mood" INTEGER,
    "energy" INTEGER,
    "focus" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Area_userId_idx" ON "Area"("userId");

-- CreateIndex
CREATE INDEX "Task_userId_status_idx" ON "Task"("userId", "status");

-- CreateIndex
CREATE INDEX "Task_userId_dueDate_idx" ON "Task"("userId", "dueDate");

-- CreateIndex
CREATE INDEX "Habit_userId_idx" ON "Habit"("userId");

-- CreateIndex
CREATE INDEX "HabitTick_habitId_createdAt_idx" ON "HabitTick"("habitId", "createdAt");

-- CreateIndex
CREATE INDEX "Routine_userId_idx" ON "Routine"("userId");

-- CreateIndex
CREATE INDEX "RoutineCompletion_routineId_date_idx" ON "RoutineCompletion"("routineId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "RoutineCompletion_routineId_date_key" ON "RoutineCompletion"("routineId", "date");

-- CreateIndex
CREATE INDEX "XpLedger_userId_createdAt_idx" ON "XpLedger"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCommission_userId_date_key" ON "DailyCommission"("userId", "date");

-- CreateIndex
CREATE INDEX "Review_userId_kind_createdAt_idx" ON "Review"("userId", "kind", "createdAt");
