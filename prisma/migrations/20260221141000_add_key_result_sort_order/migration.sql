-- Add explicit ordering for key results so users can reorder KRs.
ALTER TABLE "KeyResult"
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Backfill deterministic order within each goal.
WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "goalId"
      ORDER BY "createdAt" ASC, id ASC
    ) - 1 AS row_index
  FROM "KeyResult"
)
UPDATE "KeyResult" kr
SET "sortOrder" = o.row_index
FROM ordered o
WHERE kr.id = o.id;
