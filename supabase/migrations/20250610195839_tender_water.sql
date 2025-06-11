/*
  # Create universities and scholarships system

  1. New Tables
    - `universities`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `location` (text)
      - `website` (text)
      - `logo_url` (text)
      - `established_year` (integer)
      - `student_count` (integer)
      - `acceptance_rate` (numeric)
      - `tuition_range` (text)
      - `type` (text)
      - `campus_size` (text)
      - `programs` (text array)
      - `address` (jsonb)
      - `contact` (jsonb)
      - `user_id` (uuid, foreign key)
      - `is_approved` (boolean, default false)
      - `profile_completed` (boolean, default false)
      - `terms_accepted` (boolean, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `scholarships`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `amount` (numeric)
      - `deadline` (date)
      - `requirements` (text array)
      - `field_of_study` (text)
      - `level` (text)
      - `eligibility` (text array)
      - `benefits` (text array)
      - `is_exclusive` (boolean, default false)
      - `is_active` (boolean, default true)
      - `university_id` (uuid, foreign key)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for universities and scholarships management
    - Users can only manage their own university and scholarships
*/

-- Create universities table
CREATE TABLE IF NOT EXISTS universities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  location text,
  website text,
  logo_url text,
  established_year integer,
  student_count integer,
  acceptance_rate numeric(5,2),
  tuition_range text,
  type text CHECK (type IN ('Public', 'Private')),
  campus_size text CHECK (campus_size IN ('Small', 'Medium', 'Large')),
  programs text[] DEFAULT '{}',
  address jsonb DEFAULT '{}',
  contact jsonb DEFAULT '{}',
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  is_approved boolean DEFAULT false,
  profile_completed boolean DEFAULT false,
  terms_accepted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create scholarships table
CREATE TABLE IF NOT EXISTS scholarships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  amount numeric(12,2) NOT NULL,
  deadline date NOT NULL,
  requirements text[] DEFAULT '{}',
  field_of_study text,
  level text CHECK (level IN ('undergraduate', 'graduate', 'doctorate')),
  eligibility text[] DEFAULT '{}',
  benefits text[] DEFAULT '{}',
  is_exclusive boolean DEFAULT false,
  is_active boolean DEFAULT true,
  university_id uuid REFERENCES universities(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE scholarships ENABLE ROW LEVEL SECURITY;

-- Create policies for universities
CREATE POLICY "Universities are viewable by everyone"
  ON universities
  FOR SELECT
  TO public
  USING (is_approved = true);

CREATE POLICY "Users can insert their own university"
  ON universities
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own university"
  ON universities
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own university"
  ON universities
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for scholarships
CREATE POLICY "Scholarships are viewable by everyone"
  ON scholarships
  FOR SELECT
  TO public
  USING (is_active = true AND EXISTS (
    SELECT 1 FROM universities 
    WHERE universities.id = scholarships.university_id 
    AND universities.is_approved = true
  ));

CREATE POLICY "University owners can manage their scholarships"
  ON scholarships
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM universities 
    WHERE universities.id = scholarships.university_id 
    AND universities.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM universities 
    WHERE universities.id = scholarships.university_id 
    AND universities.user_id = auth.uid()
  ));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_universities_user_id ON universities(user_id);
CREATE INDEX IF NOT EXISTS idx_universities_approved ON universities(is_approved);
CREATE INDEX IF NOT EXISTS idx_scholarships_university_id ON scholarships(university_id);
CREATE INDEX IF NOT EXISTS idx_scholarships_active ON scholarships(is_active);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_universities_updated_at 
  BEFORE UPDATE ON universities 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scholarships_updated_at 
  BEFORE UPDATE ON scholarships 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();