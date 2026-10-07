CREATE TYPE "PeriodicTaskFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

CREATE TABLE "PeriodicTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "areaId" TEXT,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "frequency" "PeriodicTaskFrequency" NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 5,
    "goldReward" INTEGER NOT NULL DEFAULT 2,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeriodicTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PeriodicTaskCheckIn" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "frequency" "PeriodicTaskFrequency" NOT NULL,
    "periodKey" TEXT NOT NULL,
    "xpGranted" INTEGER NOT NULL,
    "goldGranted" INTEGER NOT NULL,
    "areaId" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PeriodicTaskCheckIn_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PeriodicTask_userId_frequency_archived_idx" ON "PeriodicTask"("userId", "frequency", "archived");
CREATE INDEX "PeriodicTask_areaId_idx" ON "PeriodicTask"("areaId");
CREATE UNIQUE INDEX "PeriodicTaskCheckIn_taskId_frequency_periodKey_key" ON "PeriodicTaskCheckIn"("taskId", "frequency", "periodKey");
CREATE INDEX "PeriodicTaskCheckIn_taskId_completedAt_idx" ON "PeriodicTaskCheckIn"("taskId", "completedAt");

ALTER TABLE "PeriodicTask" ADD CONSTRAINT "PeriodicTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PeriodicTask" ADD CONSTRAINT "PeriodicTask_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PeriodicTaskCheckIn" ADD CONSTRAINT "PeriodicTaskCheckIn_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "PeriodicTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
