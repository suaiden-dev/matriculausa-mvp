-- Create scholarship favorites table
CREATE TABLE IF NOT EXISTS scholarship_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scholarship_id UUID NOT NULL REFERENCES scholarships(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, scholarship_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_scholarship_favorites_user_id ON scholarship_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_scholarship_favorites_scholarship_id ON scholarship_favorites(scholarship_id);

-- Enable RLS
ALTER TABLE scholarship_favorites ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own favorites" ON scholarship_favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites" ON scholarship_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" ON scholarship_favorites
  FOR DELETE USING (auth.uid() = user_id);

