-- CreateEnum
CREATE TYPE "FinanceAccountType" AS ENUM ('cash', 'bank', 'wallet', 'credit', 'investment', 'debt', 'receivable', 'virtual');

-- CreateEnum
CREATE TYPE "FinanceTransactionType" AS ENUM ('income', 'expense', 'transfer');

-- CreateTable
CREATE TABLE "FinanceAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinanceAccountType" NOT NULL DEFAULT 'cash',
    "currencyCode" TEXT NOT NULL DEFAULT 'CNY',
    "initialBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "balanceCents" INTEGER NOT NULL DEFAULT 0,
    "includeInNetWorth" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT NOT NULL DEFAULT '#b68838',
    "icon" TEXT NOT NULL DEFAULT 'wallet',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceCategory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "FinanceTransactionType" NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#b68838',
    "monthlyBudgetCents" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "FinanceTransactionType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'CNY',
    "sourceAccountId" TEXT,
    "targetAccountId" TEXT,
    "categoryId" TEXT,
    "payee" TEXT,
    "note" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinanceAccount_userId_archived_idx" ON "FinanceAccount"("userId", "archived");

-- CreateIndex
CREATE INDEX "FinanceAccount_userId_type_idx" ON "FinanceAccount"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceCategory_userId_kind_name_key" ON "FinanceCategory"("userId", "kind", "name");

-- CreateIndex
CREATE INDEX "FinanceCategory_userId_kind_archived_idx" ON "FinanceCategory"("userId", "kind", "archived");

-- CreateIndex
CREATE INDEX "FinanceTransaction_userId_occurredAt_idx" ON "FinanceTransaction"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "FinanceTransaction_userId_type_occurredAt_idx" ON "FinanceTransaction"("userId", "type", "occurredAt");

-- CreateIndex
CREATE INDEX "FinanceTransaction_sourceAccountId_idx" ON "FinanceTransaction"("sourceAccountId");

-- CreateIndex
CREATE INDEX "FinanceTransaction_targetAccountId_idx" ON "FinanceTransaction"("targetAccountId");

-- CreateIndex
CREATE INDEX "FinanceTransaction_categoryId_idx" ON "FinanceTransaction"("categoryId");

-- AddForeignKey
ALTER TABLE "FinanceAccount" ADD CONSTRAINT "FinanceAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceCategory" ADD CONSTRAINT "FinanceCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_sourceAccountId_fkey" FOREIGN KEY ("sourceAccountId") REFERENCES "FinanceAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_targetAccountId_fkey" FOREIGN KEY ("targetAccountId") REFERENCES "FinanceAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinanceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
