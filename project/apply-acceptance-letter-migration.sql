-- Script para aplicar a migração da carta de aceite
-- Execute este script no SQL Editor do Supabase Dashboard

-- 1. Verificar se os campos já existem
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'scholarship_applications' 
  AND column_name IN ('acceptance_letter_url', 'acceptance_letter_status', 'acceptance_letter_sent_at');

-- 2. Adicionar campos se não existirem
ALTER TABLE public.scholarship_applications
ADD COLUMN IF NOT EXISTS acceptance_letter_url TEXT,
ADD COLUMN IF NOT EXISTS acceptance_letter_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS acceptance_letter_sent_at TIMESTAMPTZ;

-- 3. Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_scholarship_applications_acceptance_letter_status 
ON public.scholarship_applications(acceptance_letter_status);

-- 4. Verificar se os campos foram criados
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'scholarship_applications' 
  AND column_name IN ('acceptance_letter_url', 'acceptance_letter_status', 'acceptance_letter_sent_at');

-- 5. Verificar se há dados existentes
SELECT 
  id,
  acceptance_letter_url,
  acceptance_letter_status,
  acceptance_letter_sent_at
FROM public.scholarship_applications 
LIMIT 5;
