/*
  # Add Payment Fields to Scholarship Applications

  This migration adds the missing payment-related fields that the code is trying to use
  but were never created in the database schema.

  1. New Fields
    - payment_status: Track payment status (pending, paid, failed)
    - paid_at: Timestamp when payment was completed
    - is_application_fee_paid: Boolean flag for application fee
    - is_scholarship_fee_paid: Boolean flag for scholarship fee

  2. Default Values
    - All new fields have appropriate default values
    - Existing records will be updated with safe defaults

  3. Indexes
    - Add indexes for better performance on payment queries
*/

-- Add payment-related fields to scholarship_applications table
ALTER TABLE scholarship_applications 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS paid_at timestamptz,
ADD COLUMN IF NOT EXISTS is_application_fee_paid boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_scholarship_fee_paid boolean DEFAULT false;

-- Add constraint for payment_status values
ALTER TABLE scholarship_applications 
ADD CONSTRAINT IF NOT EXISTS check_payment_status 
CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scholarship_applications_payment_status 
ON scholarship_applications(payment_status);

CREATE INDEX IF NOT EXISTS idx_scholarship_applications_payment_dates 
ON scholarship_applications(paid_at) WHERE paid_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scholarship_applications_fee_flags 
ON scholarship_applications(is_application_fee_paid, is_scholarship_fee_paid);

-- Update existing records to have consistent payment status
UPDATE scholarship_applications 
SET payment_status = 'pending' 
WHERE payment_status IS NULL;

-- Add comment to document the new fields
COMMENT ON COLUMN scholarship_applications.payment_status IS 'Payment status: pending, paid, failed, refunded';
COMMENT ON COLUMN scholarship_applications.paid_at IS 'Timestamp when payment was completed';
COMMENT ON COLUMN scholarship_applications.is_application_fee_paid IS 'Whether the application fee has been paid';
COMMENT ON COLUMN scholarship_applications.is_scholarship_fee_paid IS 'Whether the scholarship fee has been paid'; 
