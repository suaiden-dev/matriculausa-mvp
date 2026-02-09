-- Migration: Add explicit opt-in fields to newsletter_user_preferences
-- This ensures GDPR/LGPD compliance by requiring explicit consent before sending newsletters

-- Add email_opt_in column (nullable boolean)
-- NULL = não consentiu, false = não consentiu explicitamente, true = consentiu
ALTER TABLE newsletter_user_preferences
ADD COLUMN IF NOT EXISTS email_opt_in boolean;

-- Add opt_in_at timestamp to track when user consented
ALTER TABLE newsletter_user_preferences
ADD COLUMN IF NOT EXISTS opt_in_at timestamptz;

-- Add comments explaining the fields
COMMENT ON COLUMN newsletter_user_preferences.email_opt_in IS 'Se o usuário consentiu explicitamente em receber emails de newsletter. NULL ou false = não consentiu, true = consentiu';
COMMENT ON COLUMN newsletter_user_preferences.opt_in_at IS 'Timestamp de quando o usuário consentiu em receber emails de newsletter';

