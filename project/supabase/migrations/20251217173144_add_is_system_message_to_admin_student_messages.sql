-- Migration: Add is_system_message column to admin_student_messages
-- This column identifies system-generated messages (like welcome messages) 
-- that should not generate notifications/badges for admins

-- Add is_system_message column
ALTER TABLE public.admin_student_messages
ADD COLUMN IF NOT EXISTS is_system_message BOOLEAN DEFAULT false NOT NULL;

-- Add comment explaining the column purpose
COMMENT ON COLUMN public.admin_student_messages.is_system_message IS 
  'Indicates if this message was generated automatically by the system (e.g., welcome messages). System messages do not generate notifications/badges for admins.';

-- Create partial index for better query performance
-- This index only includes rows where is_system_message = false, which are the ones we query most often
CREATE INDEX IF NOT EXISTS idx_admin_student_messages_is_system_message 
ON public.admin_student_messages(is_system_message) 
WHERE is_system_message = false;
