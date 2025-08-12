-- Add work permissions to scholarships (F1, OPT, CPT)
ALTER TABLE scholarships
  ADD COLUMN IF NOT EXISTS work_permissions text[] DEFAULT '{}'::text[];

-- Ensure only allowed values are stored (subset of F1, OPT, CPT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'scholarships_work_permissions_valid'
  ) THEN
    ALTER TABLE scholarships
      ADD CONSTRAINT scholarships_work_permissions_valid
      CHECK (work_permissions <@ ARRAY['F1','OPT','CPT']::text[]);
  END IF;
END $$;



