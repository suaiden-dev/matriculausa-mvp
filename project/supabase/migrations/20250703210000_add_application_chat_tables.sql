/*
  # Add application chat system tables

  1. New Tables
    - `application_messages` - Store messages between students and universities
    - `application_message_attachments` - Store file attachments for messages

  2. Security
    - Enable RLS on both tables
    - Add policies for students and universities to access their messages

  3. Indexes
    - Add indexes for better performance on message queries
*/

-- Create application_messages table
CREATE TABLE IF NOT EXISTS application_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES scholarship_applications(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create application_message_attachments table
CREATE TABLE IF NOT EXISTS application_message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES application_messages(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text,
  file_size integer,
  mime_type text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE application_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_message_attachments ENABLE ROW LEVEL SECURITY;

-- Create policies for application_messages
CREATE POLICY "Users can view messages for their applications"
  ON application_messages
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT sa.student_id 
      FROM scholarship_applications sa 
      WHERE sa.id = application_messages.application_id
      UNION
      SELECT u.user_id 
      FROM scholarship_applications sa
      JOIN scholarships s ON s.id = sa.scholarship_id
      JOIN universities u ON u.id = s.university_id
      WHERE sa.id = application_messages.application_id
    )
  );

CREATE POLICY "Users can insert messages for their applications"
  ON application_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT sa.student_id 
      FROM scholarship_applications sa 
      WHERE sa.id = application_messages.application_id
      UNION
      SELECT u.user_id 
      FROM scholarship_applications sa
      JOIN scholarships s ON s.id = sa.scholarship_id
      JOIN universities u ON u.id = s.university_id
      WHERE sa.id = application_messages.application_id
    )
  );

-- Create policies for application_message_attachments
CREATE POLICY "Users can view attachments for their messages"
  ON application_message_attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM application_messages am
      WHERE am.id = application_message_attachments.message_id
      AND auth.uid() IN (
        SELECT sa.student_id 
        FROM scholarship_applications sa 
        WHERE sa.id = am.application_id
        UNION
        SELECT u.user_id 
        FROM scholarship_applications sa
        JOIN scholarships s ON s.id = sa.scholarship_id
        JOIN universities u ON u.id = s.university_id
        WHERE sa.id = am.application_id
      )
    )
  );

CREATE POLICY "Users can insert attachments for their messages"
  ON application_message_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM application_messages am
      WHERE am.id = application_message_attachments.message_id
      AND auth.uid() IN (
        SELECT sa.student_id 
        FROM scholarship_applications sa 
        WHERE sa.id = am.application_id
        UNION
        SELECT u.user_id 
        FROM scholarship_applications sa
        JOIN scholarships s ON s.id = sa.scholarship_id
        JOIN universities u ON u.id = s.university_id
        WHERE sa.id = am.application_id
      )
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_application_messages_application_id ON application_messages(application_id);
CREATE INDEX IF NOT EXISTS idx_application_messages_sender_id ON application_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_application_messages_recipient_id ON application_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_application_messages_created_at ON application_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_application_message_attachments_message_id ON application_message_attachments(message_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_application_messages_updated_at ON application_messages;
CREATE TRIGGER update_application_messages_updated_at
  BEFORE UPDATE ON application_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 