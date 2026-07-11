CREATE TYPE "RewardCategory" AS ENUM ('virtual', 'physical_small', 'physical_large');

ALTER TABLE "RewardItem"
ADD COLUMN "category" "RewardCategory" NOT NULL DEFAULT 'virtual',
ADD COLUMN "costMoneyCents" INTEGER NOT NULL DEFAULT 0;

UPDATE "RewardItem" SET "category" = 'physical_small', "costMoneyCents" = 2800 WHERE "name" = '月露茶券';
UPDATE "RewardItem" SET "category" = 'physical_small', "costMoneyCents" = 3500 WHERE "name" = '星糖点心';
UPDATE "RewardItem" SET "category" = 'virtual', "costMoneyCents" = 0 WHERE "name" = '风之空白券';
UPDATE "RewardItem" SET "category" = 'physical_small', "costMoneyCents" = 4500 WHERE "name" = '安眠烛';
UPDATE "RewardItem" SET "category" = 'physical_small', "costMoneyCents" = 8000 WHERE "name" = '蔚蓝书契';
UPDATE "RewardItem" SET "category" = 'physical_small', "costMoneyCents" = 12000 WHERE "name" = '樱宴席券';
UPDATE "RewardItem" SET "category" = 'physical_small', "costMoneyCents" = 30000 WHERE "name" = '云息疗愈';
UPDATE "RewardItem" SET "category" = 'physical_small', "costMoneyCents" = 20000 WHERE "name" = '灵感晶笔';
UPDATE "RewardItem" SET "category" = 'physical_large', "costMoneyCents" = 80000 WHERE "name" = '远野地图';
UPDATE "RewardItem" SET "category" = 'physical_large', "costMoneyCents" = 69900 WHERE "name" = '匠心礼匣';
UPDATE "RewardItem" SET "category" = 'physical_large', "costMoneyCents" = 129900 WHERE "name" = '极光工坊';
UPDATE "RewardItem" SET "category" = 'physical_large', "costMoneyCents" = 300000 WHERE "name" = '星海通行证';

ALTER TABLE "RewardRedemption"
ADD COLUMN "costMoneyCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "fulfilledAt" TIMESTAMP(3),
ADD COLUMN "idempotencyKey" TEXT,
ADD COLUMN "walletTransactionId" TEXT;

ALTER TABLE "GachaPull"
ALTER COLUMN "fateSpent" SET DEFAULT 0,
ADD COLUMN "batchId" TEXT,
ADD COLUMN "goldSpent" INTEGER NOT NULL DEFAULT 160,
ADD COLUMN "probabilityBps" INTEGER,
ADD COLUMN "rulesVersion" TEXT NOT NULL DEFAULT 'legacy';

CREATE TABLE "GachaPullBatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "goldSpent" INTEGER NOT NULL,
    "rulesVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GachaPullBatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RewardRedemption_walletTransactionId_key"
ON "RewardRedemption"("walletTransactionId");

CREATE UNIQUE INDEX "RewardRedemption_userId_idempotencyKey_key"
ON "RewardRedemption"("userId", "idempotencyKey");

CREATE INDEX "GachaPull_batchId_idx" ON "GachaPull"("batchId");

CREATE UNIQUE INDEX "GachaPullBatch_userId_idempotencyKey_key"
ON "GachaPullBatch"("userId", "idempotencyKey");

CREATE INDEX "GachaPullBatch_userId_createdAt_idx"
ON "GachaPullBatch"("userId", "createdAt");

ALTER TABLE "RewardRedemption"
ADD CONSTRAINT "RewardRedemption_walletTransactionId_fkey"
FOREIGN KEY ("walletTransactionId") REFERENCES "WalletTransaction"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GachaPull"
ADD CONSTRAINT "GachaPull_batchId_fkey"
FOREIGN KEY ("batchId") REFERENCES "GachaPullBatch"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GachaPullBatch"
ADD CONSTRAINT "GachaPullBatch_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
