-- Create table for storing Stripe Connect OAuth state parameters
CREATE TABLE IF NOT EXISTS stripe_connect_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  state TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure state is unique per university and not expired
  CONSTRAINT unique_valid_state UNIQUE (university_id, state)
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_stripe_connect_states_university_state 
ON stripe_connect_states(university_id, state);

CREATE INDEX IF NOT EXISTS idx_stripe_connect_states_expires 
ON stripe_connect_states(expires_at);

-- Add comment
COMMENT ON TABLE stripe_connect_states IS 'Stores OAuth state parameters for Stripe Connect authorization flow';
COMMENT ON COLUMN stripe_connect_states.state IS 'OAuth state parameter for security';
COMMENT ON COLUMN stripe_connect_states.expires_at IS 'When this state expires (typically 10 minutes)';
