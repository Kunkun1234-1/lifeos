ALTER TABLE "WalletAllocation"
  DROP CONSTRAINT "WalletAllocation_poolId_fkey",
  ADD CONSTRAINT "WalletAllocation_poolId_fkey"
    FOREIGN KEY ("poolId") REFERENCES "WalletPool"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
