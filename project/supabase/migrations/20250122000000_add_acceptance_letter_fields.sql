-- Adiciona campos para carta de aceite na tabela scholarship_applications
ALTER TABLE public.scholarship_applications
ADD COLUMN IF NOT EXISTS acceptance_letter_url TEXT,
ADD COLUMN IF NOT EXISTS acceptance_letter_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS acceptance_letter_sent_at TIMESTAMPTZ;

-- Criar índice para melhorar performance das consultas
CREATE INDEX IF NOT EXISTS idx_scholarship_applications_acceptance_letter_status 
ON public.scholarship_applications(acceptance_letter_status);

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.scholarship_applications.acceptance_letter_url IS 'URL do arquivo da carta de aceite no storage';
COMMENT ON COLUMN public.scholarship_applications.acceptance_letter_status IS 'Status da carta de aceite: pending, approved, rejected';
COMMENT ON COLUMN public.scholarship_applications.acceptance_letter_sent_at IS 'Data e hora em que a carta de aceite foi enviada';
