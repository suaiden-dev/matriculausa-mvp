/*
  # Add updated_at column to application_messages
  
  This migration adds an updated_at column to track when messages were last edited.
*/

-- Add updated_at column to application_messages
ALTER TABLE application_messages 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN application_messages.updated_at IS 'Timestamp when the message was last edited';

-- Create index for better performance on updated_at queries
CREATE INDEX IF NOT EXISTS idx_application_messages_updated_at ON application_messages(updated_at);

