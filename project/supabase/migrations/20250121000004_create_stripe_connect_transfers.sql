-- Create table for tracking Stripe Connect transfers
CREATE TABLE IF NOT EXISTS stripe_connect_transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transfer_id TEXT, -- Stripe transfer ID
  session_id TEXT NOT NULL, -- Stripe checkout session ID
  payment_intent_id TEXT NOT NULL, -- Stripe payment intent ID
  application_id UUID REFERENCES scholarship_applications(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Amount in cents
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed')),
  destination_account TEXT NOT NULL, -- Stripe Connect account ID
  error_message TEXT, -- Error message if transfer failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique transfers per session
  CONSTRAINT unique_transfer_per_session UNIQUE (session_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_stripe_connect_transfers_university 
ON stripe_connect_transfers(university_id);

CREATE INDEX IF NOT EXISTS idx_stripe_connect_transfers_status 
ON stripe_connect_transfers(status);

CREATE INDEX IF NOT EXISTS idx_stripe_connect_transfers_created 
ON stripe_connect_transfers(created_at);

CREATE INDEX IF NOT EXISTS idx_stripe_connect_transfers_payment_intent 
ON stripe_connect_transfers(payment_intent_id);

-- Add comments
COMMENT ON TABLE stripe_connect_transfers IS 'Tracks all Stripe Connect transfers for application fees';
COMMENT ON COLUMN stripe_connect_transfers.transfer_id IS 'Stripe transfer ID (null if failed)';
COMMENT ON COLUMN stripe_connect_transfers.session_id IS 'Stripe checkout session ID';
COMMENT ON COLUMN stripe_connect_transfers.payment_intent_id IS 'Stripe payment intent ID';
COMMENT ON COLUMN stripe_connect_transfers.application_id IS 'Related scholarship application';
COMMENT ON COLUMN stripe_connect_transfers.user_id IS 'Student who paid the fee';
COMMENT ON COLUMN stripe_connect_transfers.university_id IS 'University receiving the transfer';
COMMENT ON COLUMN stripe_connect_transfers.amount IS 'Transfer amount in cents';
COMMENT ON COLUMN stripe_connect_transfers.status IS 'Transfer status: pending, succeeded, failed';
COMMENT ON COLUMN stripe_connect_transfers.destination_account IS 'Stripe Connect account ID of university';
COMMENT ON COLUMN stripe_connect_transfers.error_message IS 'Error message if transfer failed';
