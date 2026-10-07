-- AlterTable
ALTER TABLE "Note" ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletionBatchId" TEXT;

-- CreateIndex
CREATE INDEX "Note_userId_deletedAt_idx" ON "Note"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "Note_userId_deletionBatchId_idx" ON "Note"("userId", "deletionBatchId");
