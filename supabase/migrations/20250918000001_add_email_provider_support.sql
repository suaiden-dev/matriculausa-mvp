-- Migration: Add provider support to email configurations

-- Add provider type and OAuth fields to email_configurations
ALTER TABLE email_configurations 
ADD COLUMN provider_type VARCHAR(20) DEFAULT 'gmail' NOT NULL,
ADD COLUMN oauth_access_token TEXT,
ADD COLUMN oauth_refresh_token TEXT,
ADD COLUMN oauth_token_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN microsoft_account_id VARCHAR(255);

-- Make SMTP/IMAP fields nullable for OAuth providers
ALTER TABLE email_configurations 
ALTER COLUMN smtp_host DROP NOT NULL,
ALTER COLUMN smtp_auth_user DROP NOT NULL,
ALTER COLUMN smtp_auth_pass DROP NOT NULL,
ALTER COLUMN imap_host DROP NOT NULL,
ALTER COLUMN imap_auth_user DROP NOT NULL,
ALTER COLUMN imap_auth_pass DROP NOT NULL;

-- Add constraint to ensure provider type is valid
ALTER TABLE email_configurations 
ADD CONSTRAINT email_configurations_provider_type_check 
CHECK (provider_type IN ('gmail', 'microsoft'));

-- Add index for provider type queries
CREATE INDEX idx_email_configurations_provider_type ON email_configurations(provider_type);

-- Add index for Microsoft account ID
CREATE INDEX idx_email_configurations_microsoft_account_id ON email_configurations(microsoft_account_id);

-- Update comments
COMMENT ON COLUMN email_configurations.provider_type IS 'Email provider type: gmail or microsoft';
COMMENT ON COLUMN email_configurations.oauth_access_token IS 'OAuth access token for API access (encrypted)';
COMMENT ON COLUMN email_configurations.oauth_refresh_token IS 'OAuth refresh token for token renewal (encrypted)';
COMMENT ON COLUMN email_configurations.oauth_token_expires_at IS 'OAuth access token expiration timestamp';
COMMENT ON COLUMN email_configurations.microsoft_account_id IS 'Microsoft account ID for identification';

-- Add constraint to ensure required fields based on provider type
-- For Gmail: SMTP/IMAP fields are required
-- For Microsoft: OAuth fields are required
ALTER TABLE email_configurations 
ADD CONSTRAINT email_configurations_provider_fields_check 
CHECK (
  CASE 
    WHEN provider_type = 'gmail' THEN 
      smtp_host IS NOT NULL AND 
      smtp_auth_user IS NOT NULL AND 
      smtp_auth_pass IS NOT NULL AND 
      imap_host IS NOT NULL AND 
      imap_auth_user IS NOT NULL AND 
      imap_auth_pass IS NOT NULL
    WHEN provider_type = 'microsoft' THEN 
      oauth_access_token IS NOT NULL AND 
      oauth_refresh_token IS NOT NULL AND 
      microsoft_account_id IS NOT NULL
    ELSE false
  END
);

-- Update RLS policies to include provider-specific access
-- (Assuming RLS is already configured for user-based access)

-- Add function to check if OAuth token needs refresh
CREATE OR REPLACE FUNCTION is_oauth_token_expired(config_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    CASE 
      WHEN oauth_token_expires_at IS NULL THEN false
      ELSE oauth_token_expires_at <= NOW() + INTERVAL '5 minutes'
    END
  FROM email_configurations 
  WHERE id = config_id;
$$;

COMMENT ON FUNCTION is_oauth_token_expired(UUID) IS 'Check if OAuth token needs refresh (expires in 5 minutes or less)';