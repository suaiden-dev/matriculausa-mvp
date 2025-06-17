/*
  # Remove unnecessary university statistics fields

  1. Remove Fields
    - Remove established_year (not needed)
    - Remove student_count (not needed)
    - Remove acceptance_rate (not needed)
    - Remove tuition_range (not needed)
    - Remove campus_size (not needed)

  2. Keep Essential Fields
    - Keep name, description, location, website, logo_url
    - Keep address, contact, programs
    - Keep user_id, is_approved, profile_completed, terms_accepted
    - Keep created_at, updated_at
*/

-- Remove unnecessary fields from universities table
DO $$
BEGIN
  -- Remove established_year column if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'universities' AND column_name = 'established_year'
  ) THEN
    ALTER TABLE universities DROP COLUMN established_year;
  END IF;

  -- Remove student_count column if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'universities' AND column_name = 'student_count'
  ) THEN
    ALTER TABLE universities DROP COLUMN student_count;
  END IF;

  -- Remove acceptance_rate column if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'universities' AND column_name = 'acceptance_rate'
  ) THEN
    ALTER TABLE universities DROP COLUMN acceptance_rate;
  END IF;

  -- Remove tuition_range column if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'universities' AND column_name = 'tuition_range'
  ) THEN
    ALTER TABLE universities DROP COLUMN tuition_range;
  END IF;

  -- Remove campus_size column if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'universities' AND column_name = 'campus_size'
  ) THEN
    ALTER TABLE universities DROP COLUMN campus_size;
  END IF;

  -- Remove type column if exists (not essential for core functionality)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'universities' AND column_name = 'type'
  ) THEN
    ALTER TABLE universities DROP COLUMN type;
  END IF;
END $$;

-- Remove any constraints related to the dropped columns
DO $$
BEGIN
  -- Drop campus_size check constraint if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'universities' AND constraint_name = 'universities_campus_size_check'
  ) THEN
    ALTER TABLE universities DROP CONSTRAINT universities_campus_size_check;
  END IF;

  -- Drop type check constraint if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'universities' AND constraint_name = 'universities_type_check'
  ) THEN
    ALTER TABLE universities DROP CONSTRAINT universities_type_check;
  END IF;
END $$;