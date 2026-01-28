-- Migration: Update insert_welcome_message function to set is_system_message = true
-- This ensures welcome messages are marked as system messages and don't generate admin notifications

CREATE OR REPLACE FUNCTION public.insert_welcome_message(
  p_conversation_id uuid,
  p_admin_id uuid,
  p_student_id uuid,
  p_message_text text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if welcome message already exists (prevent duplication)
  IF EXISTS (
    SELECT 1
    FROM public.admin_student_messages
    WHERE conversation_id = p_conversation_id
    AND (
      message LIKE '%Welcome to Support Chat%'
      OR message LIKE '%Bem-vindo ao Chat de Suporte%'
      OR message LIKE '%Bienvenido al Chat de Soporte%'
    )
    LIMIT 1
  ) THEN
    RETURN false; -- Message already exists
  END IF;

  -- Insert welcome message (SECURITY DEFINER bypasses RLS)
  -- Mark as system message so it doesn't generate admin notifications
  INSERT INTO public.admin_student_messages (
    conversation_id,
    sender_id,
    recipient_id,
    message,
    read_at,
    is_system_message
  )
  VALUES (
    p_conversation_id,
    p_admin_id,
    p_student_id,
    p_message_text,
    NULL,  -- Leave as null so it appears as unread for the student
    true   -- Mark as system message - won't generate admin notifications
  );

  -- Update conversation's last_message_at
  UPDATE public.admin_student_conversations
  SET 
    last_message_at = NOW(),
    updated_at = NOW()
  WHERE id = p_conversation_id;

  RETURN true; -- Message inserted successfully
END;
$$;

-- Grant execute permissions on helper function
GRANT EXECUTE ON FUNCTION public.insert_welcome_message(uuid, uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_welcome_message(uuid, uuid, uuid, text) TO anon;
