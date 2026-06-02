ALTER TABLE "RewardRedemption"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'available',
  ADD COLUMN "usedAt" TIMESTAMP(3),
  ADD COLUMN "discardedAt" TIMESTAMP(3),
  ADD COLUMN "note" TEXT;

CREATE INDEX "RewardRedemption_userId_status_idx" ON "RewardRedemption"("userId", "status");
