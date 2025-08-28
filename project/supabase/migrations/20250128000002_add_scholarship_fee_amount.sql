/*
  # Add Scholarship Fee Amount Field
  
  This migration adds the scholarship_fee_amount field to the scholarships table
  to support dynamic scholarship fees similar to application_fee_amount.
  
  ## Changes:
  1. Add scholarship_fee_amount field (integer, nullable)
  2. Set default value for existing scholarships
  3. Add comment for documentation
*/

-- Add scholarship_fee_amount field to scholarships table
ALTER TABLE scholarships 
ADD COLUMN IF NOT EXISTS scholarship_fee_amount integer;

-- Set default value for existing scholarships (standard scholarship fee)
UPDATE scholarships 
SET scholarship_fee_amount = 850
WHERE scholarship_fee_amount IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN scholarships.scholarship_fee_amount IS 'Amount for scholarship fee in cents (default: 850 = $8.50)';

-- Create index for better performance on scholarship fee queries
CREATE INDEX IF NOT EXISTS idx_scholarships_scholarship_fee_amount 
ON scholarships(scholarship_fee_amount) 
WHERE scholarship_fee_amount IS NOT NULL;
