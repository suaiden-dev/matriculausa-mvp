-- Migration: Add cpf_document column to user_profiles
-- Description: Adds a column to store Brazilian CPF (Cadastro de Pessoas Físicas) for Parcelow payments
-- Created: 2026-01-28

-- Add cpf_document column to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS cpf_document TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN user_profiles.cpf_document IS 'Brazilian CPF (Cadastro de Pessoas Físicas) - Tax ID required for Parcelow payments';

-- Create index for faster lookups if needed
CREATE INDEX IF NOT EXISTS idx_user_profiles_cpf_document ON user_profiles(cpf_document) WHERE cpf_document IS NOT NULL;
