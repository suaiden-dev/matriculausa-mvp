-- Migration: Add Matricula Rewards opt-in fields to universities table
-- Date: 2025-01-22
-- Description: Add fields to control university participation in Matricula Rewards program

-- Add new fields to universities table
ALTER TABLE universities 
ADD COLUMN IF NOT EXISTS participates_in_matricula_rewards boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS matricula_rewards_opted_in_at timestamptz,
ADD COLUMN IF NOT EXISTS matricula_rewards_opt_in_notes text;

-- Add comment to explain the new fields
COMMENT ON COLUMN universities.participates_in_matricula_rewards IS 'Whether the university has opted to participate in the Matricula Rewards program';
COMMENT ON COLUMN universities.matricula_rewards_opted_in_at IS 'Timestamp when the university opted into the Matricula Rewards program';
COMMENT ON COLUMN universities.matricula_rewards_opt_in_notes IS 'Additional notes about the university''s participation in Matricula Rewards';

-- Create index for better performance when filtering participating universities
CREATE INDEX IF NOT EXISTS idx_universities_matricula_rewards_participation 
ON universities(participates_in_matricula_rewards) 
WHERE participates_in_matricula_rewards = true;

-- Update existing universities to not participate by default (for safety)
UPDATE universities 
SET participates_in_matricula_rewards = false 
WHERE participates_in_matricula_rewards IS NULL;
