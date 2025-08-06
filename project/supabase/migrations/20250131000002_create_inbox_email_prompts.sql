-- Create inbox_email_prompts table
CREATE TABLE IF NOT EXISTS inbox_email_prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  prompt TEXT DEFAULT NULL,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(university_id)
);

-- Add comments
COMMENT ON TABLE inbox_email_prompts IS 'Stores email processing prompts for each university';
COMMENT ON COLUMN inbox_email_prompts.prompt IS 'Custom instructions for email processing and analysis';
COMMENT ON COLUMN inbox_email_prompts.university_id IS 'Reference to the university this prompt belongs to';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inbox_email_prompts_university_id ON inbox_email_prompts(university_id);
CREATE INDEX IF NOT EXISTS idx_inbox_email_prompts_created_at ON inbox_email_prompts(created_at);

-- Enable RLS
ALTER TABLE inbox_email_prompts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view email prompts for their university" ON inbox_email_prompts
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM user_profiles 
      WHERE university_id = inbox_email_prompts.university_id
    )
  );

CREATE POLICY "Users can insert email prompts for their university" ON inbox_email_prompts
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM user_profiles 
      WHERE university_id = inbox_email_prompts.university_id
    )
  );

CREATE POLICY "Users can update email prompts for their university" ON inbox_email_prompts
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM user_profiles 
      WHERE university_id = inbox_email_prompts.university_id
    )
  );

CREATE POLICY "Users can delete email prompts for their university" ON inbox_email_prompts
  FOR DELETE USING (
    auth.uid() IN (
      SELECT user_id FROM user_profiles 
      WHERE university_id = inbox_email_prompts.university_id
    )
  );

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_inbox_email_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inbox_email_prompts_updated_at
  BEFORE UPDATE ON inbox_email_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_inbox_email_prompts_updated_at(); 