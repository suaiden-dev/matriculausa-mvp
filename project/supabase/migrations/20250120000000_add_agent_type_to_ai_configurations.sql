-- Add agent_type column to ai_configurations table
ALTER TABLE public.ai_configurations 
ADD COLUMN agent_type TEXT;

-- Update existing records to have a default agent type
UPDATE public.ai_configurations 
SET agent_type = 'General Information' 
WHERE agent_type IS NULL;

-- Make agent_type NOT NULL after setting default values
ALTER TABLE public.ai_configurations 
ALTER COLUMN agent_type SET NOT NULL;

-- Add index for better performance on agent_type queries
CREATE INDEX IF NOT EXISTS idx_ai_configurations_agent_type ON public.ai_configurations(agent_type); 