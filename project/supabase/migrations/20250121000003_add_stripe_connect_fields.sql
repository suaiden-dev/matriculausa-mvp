-- Add Stripe Connect fields to university_fee_configurations table
ALTER TABLE university_fee_configurations 
ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_account_name TEXT,
ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_requirements_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_access_token TEXT,
ADD COLUMN IF NOT EXISTS stripe_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS stripe_token_expires_at TIMESTAMPTZ;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_university_fee_config_stripe_account 
ON university_fee_configurations(stripe_connect_account_id);

-- Add comments
COMMENT ON COLUMN university_fee_configurations.stripe_connect_account_id IS 'Stripe Connect account ID for this university';
COMMENT ON COLUMN university_fee_configurations.stripe_account_name IS 'Business name from Stripe account';
COMMENT ON COLUMN university_fee_configurations.stripe_charges_enabled IS 'Whether the Stripe account can accept charges';
COMMENT ON COLUMN university_fee_configurations.stripe_payouts_enabled IS 'Whether the Stripe account can receive payouts';
COMMENT ON COLUMN university_fee_configurations.stripe_requirements_completed IS 'Whether all Stripe account requirements are met';
COMMENT ON COLUMN university_fee_configurations.stripe_access_token IS 'OAuth access token for Stripe Connect (encrypted)';
COMMENT ON COLUMN university_fee_configurations.stripe_refresh_token IS 'OAuth refresh token for Stripe Connect (encrypted)';
COMMENT ON COLUMN university_fee_configurations.stripe_token_expires_at IS 'When the access token expires';
