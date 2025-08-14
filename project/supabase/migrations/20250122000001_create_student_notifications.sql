-- Create student notifications table
CREATE TABLE IF NOT EXISTS student_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  link TEXT,
  metadata JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  idempotency_key TEXT UNIQUE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_student_notifications_user_id ON student_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_student_notifications_read_at ON student_notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_student_notifications_created_at ON student_notifications(created_at);

-- Enable RLS
ALTER TABLE student_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own notifications" ON student_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON student_notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications" ON student_notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_student_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_student_notifications_updated_at
  BEFORE UPDATE ON student_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_student_notifications_updated_at();
