/*
  # Fix Application Fee Amounts
  
  This migration fixes incorrect application_fee_amount values in the scholarships table.
  
  Current issues:
  - Some scholarships have 100 cents ($1.00) instead of 10000 cents ($100.00)
  - Some scholarships have 350 cents ($3.50) instead of 10000 cents ($100.00)
  
  This migration will:
  1. Update all application_fee_amount values to 10000 cents ($100.00)
  2. Add a comment explaining the correct format
*/

-- Update all application_fee_amount values to 10000 cents ($100.00)
UPDATE scholarships 
SET application_fee_amount = 10000
WHERE application_fee_amount IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN scholarships.application_fee_amount IS 'Application fee amount in cents (10000 = $100.00)';

-- Verify the update
SELECT 
  id,
  title,
  application_fee_amount,
  (application_fee_amount / 100.0) as application_fee_dollars
FROM scholarships 
WHERE application_fee_amount IS NOT NULL
ORDER BY application_fee_amount;
