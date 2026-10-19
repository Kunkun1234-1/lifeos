ALTER TABLE "Task" ADD COLUMN "boardPosition" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Task" ADD COLUMN "rewardClaimedAt" TIMESTAMP(3);

UPDATE "Task"
SET "rewardClaimedAt" = COALESCE("completedAt", "updatedAt")
WHERE "status" = 'DONE';

UPDATE "Task" AS task
SET "rewardClaimedAt" = ledger."createdAt"
FROM "XpLedger" AS ledger
WHERE ledger."source" = 'task'
  AND ledger."sourceId" = task."id"
  AND task."rewardClaimedAt" IS NULL;

DROP INDEX IF EXISTS "Task_userId_status_idx";
CREATE INDEX "Task_userId_status_boardPosition_idx" ON "Task"("userId", "status", "boardPosition");
