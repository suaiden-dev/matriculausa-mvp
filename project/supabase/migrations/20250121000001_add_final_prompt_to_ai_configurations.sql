-- Add final_prompt column to ai_configurations table
ALTER TABLE ai_configurations 
ADD COLUMN IF NOT EXISTS final_prompt TEXT;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_ai_configurations_final_prompt 
ON ai_configurations(final_prompt);

-- Add comment to document the column
COMMENT ON COLUMN ai_configurations.final_prompt IS 'The complete generated prompt that combines base prompt, personality, and custom instructions'; 