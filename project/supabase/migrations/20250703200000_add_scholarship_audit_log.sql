/*
  # Add scholarship audit logging and image_url field

  1. New Table
    - `scholarship_audit_log` - Track all changes to scholarships
      - `id` (uuid, primary key)
      - `scholarship_id` (uuid, foreign key to scholarships)
      - `changed_by` (uuid, foreign key to auth.users)
      - `change_type` (text) - created, updated, deleted
      - `old_values` (jsonb) - Previous values before change
      - `new_values` (jsonb) - New values after change
      - `change_description` (text) - Optional description of change
      - `changed_at` (timestamp)

  2. Add missing fields
    - Add `image_url` to scholarships table if not exists
    - Add `annual_value_with_scholarship` if not exists

  3. Security
    - Enable RLS on audit log table
    - Add policies for university owners to view their scholarship audit logs
*/

-- Add missing fields to scholarships table
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS annual_value_with_scholarship numeric(12,2);

-- Create scholarship audit log table
CREATE TABLE IF NOT EXISTS scholarship_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scholarship_id uuid REFERENCES scholarships(id) ON DELETE CASCADE,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  change_type text NOT NULL CHECK (change_type IN ('created', 'updated', 'deleted')),
  old_values jsonb,
  new_values jsonb,
  change_description text,
  changed_at timestamptz DEFAULT now()
);

-- Enable RLS on audit log table
ALTER TABLE scholarship_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policies for audit log
CREATE POLICY "University owners can view their scholarship audit logs"
  ON scholarship_audit_log
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM scholarships s
    JOIN universities u ON u.id = s.university_id
    WHERE s.id = scholarship_audit_log.scholarship_id
    AND u.user_id = auth.uid()
  ));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scholarship_audit_log_scholarship_id ON scholarship_audit_log(scholarship_id);
CREATE INDEX IF NOT EXISTS idx_scholarship_audit_log_changed_at ON scholarship_audit_log(changed_at);
CREATE INDEX IF NOT EXISTS idx_scholarship_audit_log_change_type ON scholarship_audit_log(change_type);

-- Create trigger function to automatically log scholarship changes
CREATE OR REPLACE FUNCTION log_scholarship_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log creation
  IF TG_OP = 'INSERT' THEN
    INSERT INTO scholarship_audit_log (
      scholarship_id,
      changed_by,
      change_type,
      new_values,
      change_description
    ) VALUES (
      NEW.id,
      auth.uid(),
      'created',
      to_jsonb(NEW),
      'Scholarship created'
    );
    RETURN NEW;
  END IF;

  -- Log updates
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO scholarship_audit_log (
      scholarship_id,
      changed_by,
      change_type,
      old_values,
      new_values,
      change_description
    ) VALUES (
      NEW.id,
      auth.uid(),
      'updated',
      to_jsonb(OLD),
      to_jsonb(NEW),
      'Scholarship updated'
    );
    RETURN NEW;
  END IF;

  -- Log deletion
  IF TG_OP = 'DELETE' THEN
    INSERT INTO scholarship_audit_log (
      scholarship_id,
      changed_by,
      change_type,
      old_values,
      change_description
    ) VALUES (
      OLD.id,
      auth.uid(),
      'deleted',
      to_jsonb(OLD),
      'Scholarship deleted'
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ language 'plpgsql';

-- Create trigger to automatically log changes
DROP TRIGGER IF EXISTS scholarship_audit_trigger ON scholarships;
CREATE TRIGGER scholarship_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON scholarships
  FOR EACH ROW EXECUTE FUNCTION log_scholarship_changes(); 