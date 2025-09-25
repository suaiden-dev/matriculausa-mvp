-- Migration: Create user fee overrides table and function
-- This allows admins to set custom fees for individual students

-- Create table for storing user-specific fee overrides
CREATE TABLE IF NOT EXISTS user_fee_overrides (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selection_process_fee DECIMAL(10,2),
  application_fee DECIMAL(10,2),
  scholarship_fee DECIMAL(10,2),
  i20_control_fee DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id)
);

-- Add RLS policies
ALTER TABLE user_fee_overrides ENABLE ROW LEVEL SECURITY;

-- Allow admins to read and write all fee overrides
CREATE POLICY "Admins can manage all fee overrides" ON user_fee_overrides
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Allow users to read their own fee overrides
CREATE POLICY "Users can read their own fee overrides" ON user_fee_overrides
  FOR SELECT USING (user_id = auth.uid());

-- Create function to create table if not exists (for dynamic creation)
CREATE OR REPLACE FUNCTION create_user_fee_overrides_table_if_not_exists()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function is a no-op since the table is already created above
  -- It's just here for compatibility with the frontend code
  RETURN;
END;
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_fee_overrides_user_id ON user_fee_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_user_fee_overrides_updated_at ON user_fee_overrides(updated_at);

-- Add trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_fee_overrides_updated_at
  BEFORE UPDATE ON user_fee_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();