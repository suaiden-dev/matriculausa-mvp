/*
  # Add read status to application_messages
  
  This migration adds read status tracking to the application_messages table.
  
  1. Add read_at column to track when messages were read
  2. Add index for better performance on read status queries
  3. Update existing messages to have null read_at (unread)
*/

-- Add read_at column to application_messages
ALTER TABLE application_messages 
ADD COLUMN read_at timestamptz DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN application_messages.read_at IS 'Timestamp when the message was read by the recipient';

-- Create index for better performance on read status queries
CREATE INDEX IF NOT EXISTS idx_application_messages_read_at ON application_messages(read_at);

-- Create index for unread messages queries
CREATE INDEX IF NOT EXISTS idx_application_messages_unread ON application_messages(application_id, recipient_id, read_at) 
WHERE read_at IS NULL;

