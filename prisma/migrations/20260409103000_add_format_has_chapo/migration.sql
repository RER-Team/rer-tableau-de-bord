-- Add explicit "hasChapo" setting to editorial formats.
ALTER TABLE "Format"
ADD COLUMN "hasChapo" BOOLEAN NOT NULL DEFAULT true;

-- Backfill existing formats based on historical naming convention.
UPDATE "Format"
SET "hasChapo" = CASE
  WHEN LOWER("libelle") LIKE '%brève%' OR LOWER("libelle") LIKE '%breve%' OR LOWER("libelle") LIKE '%actu%'
    THEN false
  ELSE true
END;
