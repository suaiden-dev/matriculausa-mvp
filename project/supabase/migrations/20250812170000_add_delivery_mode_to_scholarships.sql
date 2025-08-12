/*
  # Add delivery_mode to scholarships

  - Adds a new column `delivery_mode` to `scholarships` with allowed values:
    - in_person, hybrid, online
  - Sets default to 'in_person'
*/

ALTER TABLE scholarships 
  ADD COLUMN IF NOT EXISTS delivery_mode text;

-- Add check constraint safely (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'scholarships' AND constraint_name = 'scholarships_delivery_mode_check'
  ) THEN
    ALTER TABLE scholarships 
      ADD CONSTRAINT scholarships_delivery_mode_check 
      CHECK (delivery_mode IN ('in_person','hybrid','online'));
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'delivery_mode constraint may already exist: %', SQLERRM;
END $$;

-- Default value
UPDATE scholarships SET delivery_mode = COALESCE(delivery_mode, 'in_person');

