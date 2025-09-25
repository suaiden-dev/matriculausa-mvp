-- Create email_rate_limits table for persistent rate limiting
CREATE TABLE IF NOT EXISTS email_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  hourly_count INTEGER DEFAULT 0,
  hourly_reset BIGINT NOT NULL,
  daily_count INTEGER DEFAULT 0,
  daily_reset BIGINT NOT NULL,
  last_email_sent BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_rate_limits_user_id ON email_rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_email_rate_limits_hourly_reset ON email_rate_limits(hourly_reset);
CREATE INDEX IF NOT EXISTS idx_email_rate_limits_daily_reset ON email_rate_limits(daily_reset);

-- Enable RLS
ALTER TABLE email_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access
CREATE POLICY "Service role can manage email rate limits" ON email_rate_limits
  FOR ALL USING (auth.role() = 'service_role');
