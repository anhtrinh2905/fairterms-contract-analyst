-- Adds contract comparison quota columns to UserQuota so the compare feature
-- can be rate-limited alongside contract/clause analysis.
--
-- Written as idempotent (IF NOT EXISTS) because some environments already had
-- these columns added via `prisma db push` before a migration file existed,
-- and we don't want `prisma migrate deploy` to fail there with 42701
-- ("column already exists").

-- AlterTable
ALTER TABLE "UserQuota"
    ADD COLUMN IF NOT EXISTS "comparisonCount" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "comparisonLimit" INTEGER NOT NULL DEFAULT 5;
