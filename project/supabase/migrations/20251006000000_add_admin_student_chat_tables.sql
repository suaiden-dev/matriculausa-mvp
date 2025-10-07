/*
  # Add admin-student chat system tables

  1. New Tables
    - `admin_student_conversations` - Store conversations between admin and students
    - `admin_student_messages` - Store messages in these conversations
    - `admin_student_message_attachments` - Store file attachments for messages

  2. Security
    - Enable RLS on all tables
    - Add policies for admins and students to access their conversations

  3. Indexes
    - Add indexes for better performance on conversation and message queries
*/

-- Create admin_student_conversations table
CREATE TABLE IF NOT EXISTS admin_student_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_message_at timestamptz DEFAULT now(),
  UNIQUE(admin_id, student_id)
);

-- Create admin_student_messages table
CREATE TABLE IF NOT EXISTS admin_student_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES admin_student_conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  read_at timestamptz NULL
);

-- Create admin_student_message_attachments table
CREATE TABLE IF NOT EXISTS admin_student_message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES admin_student_messages(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text,
  file_size integer,
  mime_type text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE admin_student_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_student_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_student_message_attachments ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_student_conversations
CREATE POLICY "Users can view their conversations"
  ON admin_student_conversations
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = admin_id OR auth.uid() = student_id
  );

CREATE POLICY "Admins can create conversations with students"
  ON admin_student_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = admin_id AND 
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.user_id = auth.uid() AND up.user_type = 'affiliate_admin'
    )
  );

CREATE POLICY "Students can create conversations with admins"
  ON admin_student_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = student_id AND 
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.user_id = auth.uid() AND up.user_type = 'student'
    )
  );

-- Create policies for admin_student_messages
CREATE POLICY "Users can view messages in their conversations"
  ON admin_student_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_student_conversations c
      WHERE c.id = admin_student_messages.conversation_id
      AND (c.admin_id = auth.uid() OR c.student_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert messages in their conversations"
  ON admin_student_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM admin_student_conversations c
      WHERE c.id = admin_student_messages.conversation_id
      AND (c.admin_id = auth.uid() OR c.student_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own message read status"
  ON admin_student_messages
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = recipient_id AND
    EXISTS (
      SELECT 1 FROM admin_student_conversations c
      WHERE c.id = admin_student_messages.conversation_id
      AND (c.admin_id = auth.uid() OR c.student_id = auth.uid())
    )
  );

-- Create policies for admin_student_message_attachments
CREATE POLICY "Users can view attachments for their messages"
  ON admin_student_message_attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_student_messages m
      JOIN admin_student_conversations c ON c.id = m.conversation_id
      WHERE m.id = admin_student_message_attachments.message_id
      AND (c.admin_id = auth.uid() OR c.student_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert attachments for their messages"
  ON admin_student_message_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_student_messages m
      JOIN admin_student_conversations c ON c.id = m.conversation_id
      WHERE m.id = admin_student_message_attachments.message_id
      AND m.sender_id = auth.uid()
      AND (c.admin_id = auth.uid() OR c.student_id = auth.uid())
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_student_conversations_admin_id ON admin_student_conversations(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_student_conversations_student_id ON admin_student_conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_admin_student_conversations_updated_at ON admin_student_conversations(updated_at);

CREATE INDEX IF NOT EXISTS idx_admin_student_messages_conversation_id ON admin_student_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_admin_student_messages_sender_id ON admin_student_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_admin_student_messages_recipient_id ON admin_student_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_admin_student_messages_created_at ON admin_student_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_admin_student_message_attachments_message_id ON admin_student_message_attachments(message_id);

-- Create function to update conversation timestamp when message is sent
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE admin_student_conversations 
  SET 
    updated_at = now(),
    last_message_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update conversation timestamp
CREATE TRIGGER trigger_update_conversation_timestamp
  AFTER INSERT ON admin_student_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_student_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER trigger_admin_student_conversations_updated_at
  BEFORE UPDATE ON admin_student_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_student_updated_at_column();

CREATE TRIGGER trigger_admin_student_messages_updated_at
  BEFORE UPDATE ON admin_student_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_student_updated_at_column();