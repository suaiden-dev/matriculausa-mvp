-- Fix admin student chat policies to allow regular admins to see all conversations

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their conversations" ON admin_student_conversations;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON admin_student_messages;
DROP POLICY IF EXISTS "Users can view attachments for their messages" ON admin_student_message_attachments;

-- Create new policies for admin_student_conversations
CREATE POLICY "Users can view conversations - improved"
  ON admin_student_conversations
  FOR SELECT
  TO authenticated
  USING (
    -- Students can see their own conversations
    (auth.uid() = student_id) OR
    -- Affiliate admins can see their own conversations  
    (auth.uid() = admin_id) OR
    -- Regular admins can see all conversations
    (
      EXISTS (
        SELECT 1 FROM user_profiles up 
        WHERE up.user_id = auth.uid() AND up.role = 'admin'
      )
    )
  );

-- Create new policies for admin_student_messages  
CREATE POLICY "Users can view messages - improved"
  ON admin_student_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_student_conversations c
      WHERE c.id = admin_student_messages.conversation_id
      AND (
        -- Students can see messages in their conversations
        (c.student_id = auth.uid()) OR
        -- Affiliate admins can see messages in their conversations
        (c.admin_id = auth.uid()) OR
        -- Regular admins can see all messages
        (
          EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() AND up.role = 'admin'
          )
        )
      )
    )
  );

-- Create new policies for admin_student_message_attachments
CREATE POLICY "Users can view attachments - improved"
  ON admin_student_message_attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_student_messages m
      JOIN admin_student_conversations c ON c.id = m.conversation_id
      WHERE m.id = admin_student_message_attachments.message_id
      AND (
        -- Students can see attachments in their conversations
        (c.student_id = auth.uid()) OR
        -- Affiliate admins can see attachments in their conversations
        (c.admin_id = auth.uid()) OR
        -- Regular admins can see all attachments
        (
          EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() AND up.role = 'admin'
          )
        )
      )
    )
  );