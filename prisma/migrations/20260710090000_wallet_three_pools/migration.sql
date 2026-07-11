-- The account-based finance ledger is intentionally cleared. Legacy account,
-- debt, credit-card, investment, category, and transaction balances do not
-- participate in the new purpose-based wallet.
DROP TABLE "FinanceTransaction";
DROP TABLE "FinanceCategory";
DROP TABLE "FinanceAccount";
DROP TYPE "FinanceTransactionType";
DROP TYPE "FinanceAccountType";

CREATE TYPE "WalletPoolType" AS ENUM ('living', 'savings', 'flexible');
CREATE TYPE "WalletTransactionType" AS ENUM ('income', 'expense', 'transfer');
CREATE TYPE "WalletNecessity" AS ENUM ('essential', 'optional');

CREATE TABLE "WalletPool" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "WalletPoolType" NOT NULL,
    "balanceCents" INTEGER NOT NULL DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'CNY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WalletPool_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WalletMonthlyPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "livingTargetCents" INTEGER NOT NULL DEFAULT 0,
    "savingsRateBps" INTEGER NOT NULL DEFAULT 5000,
    "initialized" BOOLEAN NOT NULL DEFAULT false,
    "rolloverCompleted" BOOLEAN NOT NULL DEFAULT true,
    "rolloverAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WalletMonthlyPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'CNY',
    "necessity" "WalletNecessity",
    "sourcePoolType" "WalletPoolType",
    "targetPoolType" "WalletPoolType",
    "counterparty" TEXT,
    "note" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WalletAllocation" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "balanceAfterCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WalletAllocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WalletPool_userId_type_key" ON "WalletPool"("userId", "type");
CREATE INDEX "WalletPool_userId_idx" ON "WalletPool"("userId");
CREATE UNIQUE INDEX "WalletMonthlyPlan_userId_month_key" ON "WalletMonthlyPlan"("userId", "month");
CREATE INDEX "WalletMonthlyPlan_userId_month_idx" ON "WalletMonthlyPlan"("userId", "month");
CREATE INDEX "WalletTransaction_userId_occurredAt_idx" ON "WalletTransaction"("userId", "occurredAt");
CREATE INDEX "WalletTransaction_userId_type_occurredAt_idx" ON "WalletTransaction"("userId", "type", "occurredAt");
CREATE INDEX "WalletTransaction_userId_necessity_occurredAt_idx" ON "WalletTransaction"("userId", "necessity", "occurredAt");
CREATE INDEX "WalletAllocation_transactionId_idx" ON "WalletAllocation"("transactionId");
CREATE INDEX "WalletAllocation_poolId_createdAt_idx" ON "WalletAllocation"("poolId", "createdAt");

ALTER TABLE "WalletPool" ADD CONSTRAINT "WalletPool_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalletMonthlyPlan" ADD CONSTRAINT "WalletMonthlyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalletAllocation" ADD CONSTRAINT "WalletAllocation_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "WalletTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalletAllocation" ADD CONSTRAINT "WalletAllocation_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "WalletPool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
