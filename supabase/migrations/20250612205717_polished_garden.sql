/*
  # Add new scholarship fields for university dashboard

  1. New Fields
    - `original_value_per_credit` (numeric) - Original cost per credit
    - `original_annual_value` (numeric) - Original annual program cost
    - `scholarship_type` (text) - Type of scholarship (Especial, Prata, Ouro, Platina)

  2. Schema Updates
    - Add new fields to scholarships table
    - Ensure proper data types and constraints
*/

-- Add new fields to scholarships table
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS original_value_per_credit numeric(12,2);
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS original_annual_value numeric(12,2);
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS scholarship_type text;

-- Add check constraint for scholarship_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'scholarships' AND constraint_name = 'scholarships_scholarship_type_check'
  ) THEN
    ALTER TABLE scholarships 
    ADD CONSTRAINT scholarships_scholarship_type_check 
    CHECK (scholarship_type IN ('Especial', 'Prata', 'Ouro', 'Platina'));
  END IF;
EXCEPTION
  WHEN others THEN
    -- If there's an error, it might be because the constraint already exists or similar
    RAISE NOTICE 'Error adding constraint: %', SQLERRM;
END $$;

-- Update RLS policies to include new fields
DO $$
BEGIN
  -- Ensure RLS is enabled
  ALTER TABLE scholarships ENABLE ROW LEVEL SECURITY;
  
  -- Ensure university owners can manage their scholarships with new fields
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'scholarships' AND policyname = 'University owners can manage their scholarships'
  ) THEN
    DROP POLICY "University owners can manage their scholarships" ON scholarships;
  END IF;
  
  CREATE POLICY "University owners can manage their scholarships"
    ON scholarships
    FOR ALL
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM universities 
      WHERE universities.id = scholarships.university_id 
      AND universities.user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM universities 
      WHERE universities.id = scholarships.university_id 
      AND universities.user_id = auth.uid()
    ));
END $$;