-- Add is_template column to ai_configurations table
ALTER TABLE ai_configurations ADD COLUMN is_template BOOLEAN DEFAULT FALSE;

-- Create index for better performance when querying templates
CREATE INDEX idx_ai_configurations_is_template ON ai_configurations(is_template, user_id, university_id); 