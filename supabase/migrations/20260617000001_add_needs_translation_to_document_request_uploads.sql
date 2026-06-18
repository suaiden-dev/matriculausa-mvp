-- Adiciona coluna para registrar resultado da verificação de idioma (webhook verify-english)
-- NULL = verificação não concluída | false = documento em inglês | true = precisa/precisou de tradução
ALTER TABLE public.document_request_uploads
  ADD COLUMN IF NOT EXISTS needs_translation BOOLEAN DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_document_request_uploads_needs_translation
  ON public.document_request_uploads (needs_translation)
  WHERE needs_translation IS NOT NULL;
