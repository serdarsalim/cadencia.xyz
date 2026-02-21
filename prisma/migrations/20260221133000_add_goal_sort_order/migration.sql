-- Add explicit ordering for goals so users can reorder objectives.
ALTER TABLE "Goal"
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Backfill deterministic order per user and archived state based on creation time.
WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "userId", archived
      ORDER BY "createdAt" ASC, id ASC
    ) - 1 AS row_index
  FROM "Goal"
)
UPDATE "Goal" g
SET "sortOrder" = o.row_index
FROM ordered o
WHERE g.id = o.id;
