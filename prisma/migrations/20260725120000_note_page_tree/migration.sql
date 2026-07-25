-- AlterTable
ALTER TABLE "Note" ADD COLUMN "parentId" TEXT,
ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "icon" TEXT,
ADD COLUMN "coverUrl" TEXT;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Note_userId_parentId_position_idx" ON "Note"("userId", "parentId", "position");

-- Backfill root positions for existing notes (pinned first, then recently updated)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "userId"
      ORDER BY pinned DESC, "updatedAt" DESC
    ) - 1 AS pos
  FROM "Note"
  WHERE "parentId" IS NULL
)
UPDATE "Note" AS n
SET "position" = ranked.pos
FROM ranked
WHERE n.id = ranked.id;
