-- Add archive functionality to emails
-- This migration adds an is_archived field to received_emails table

ALTER TABLE received_emails 
ADD COLUMN is_archived BOOLEAN DEFAULT false;

-- Create index for performance on archive queries
CREATE INDEX idx_received_emails_archived ON received_emails(email_config_id, is_archived, is_deleted, received_date DESC);

-- Update existing emails to have explicit archive status (all false by default)
UPDATE received_emails SET is_archived = false WHERE is_archived IS NULL;