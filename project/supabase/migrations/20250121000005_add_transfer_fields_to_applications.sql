-- Add transfer-related fields to scholarship_applications table
ALTER TABLE scholarship_applications 
ADD COLUMN IF NOT EXISTS stripe_transfer_status TEXT DEFAULT 'pending' CHECK (stripe_transfer_status IN ('pending', 'transferred', 'failed')),
ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_transfer_amount INTEGER,
ADD COLUMN IF NOT EXISTS stripe_transfer_date TIMESTAMPTZ;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_scholarship_applications_transfer_status 
ON scholarship_applications(stripe_transfer_status);

CREATE INDEX IF NOT EXISTS idx_scholarship_applications_transfer_id 
ON scholarship_applications(stripe_transfer_id);

-- Add comments
COMMENT ON COLUMN scholarship_applications.stripe_transfer_status IS 'Status of Stripe Connect transfer: pending, transferred, failed';
COMMENT ON COLUMN scholarship_applications.stripe_transfer_id IS 'Stripe transfer ID if transfer was successful';
COMMENT ON COLUMN scholarship_applications.stripe_transfer_amount IS 'Amount transferred in cents';
COMMENT ON COLUMN scholarship_applications.stripe_transfer_date IS 'Date when transfer was completed';
