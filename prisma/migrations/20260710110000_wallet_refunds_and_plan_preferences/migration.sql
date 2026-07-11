ALTER TYPE "WalletTransactionType" ADD VALUE 'refund' BEFORE 'transfer';

ALTER TABLE "WalletMonthlyPlan"
  ADD COLUMN "carryLivingTarget" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "WalletTransaction"
  ADD COLUMN "refundOfId" TEXT;

CREATE UNIQUE INDEX "WalletTransaction_refundOfId_key"
  ON "WalletTransaction"("refundOfId");

ALTER TABLE "WalletTransaction"
  ADD CONSTRAINT "WalletTransaction_refundOfId_fkey"
  FOREIGN KEY ("refundOfId") REFERENCES "WalletTransaction"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
