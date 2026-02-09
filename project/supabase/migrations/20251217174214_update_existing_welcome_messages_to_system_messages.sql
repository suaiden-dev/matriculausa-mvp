-- Migration: Update existing welcome messages to be marked as system messages
-- This ensures that welcome messages sent before the is_system_message field was added
-- are also excluded from admin notifications/badges

-- Update all existing welcome messages to is_system_message = true
-- Using the same patterns that the insert_welcome_message function uses to identify welcome messages
UPDATE public.admin_student_messages
SET is_system_message = true
WHERE is_system_message = false
  AND (
    message LIKE '%Welcome to Support Chat%'
    OR message LIKE '%Bem-vindo ao Chat de Suporte%'
    OR message LIKE '%Bienvenido al Chat de Soporte%'
  );

-- Log how many messages were updated (optional, for verification)
DO $$
DECLARE
  updated_count integer;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE LOG 'Updated % existing welcome messages to is_system_message = true', updated_count;
END $$;
