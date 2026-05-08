ALTER TABLE scholarship_applications
  ADD COLUMN IF NOT EXISTS i20_document_url TEXT,
  ADD COLUMN IF NOT EXISTS i20_document_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS i20_document_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN scholarship_applications.i20_document_url IS 'URL do documento I-20 para alunos Change of Status (COS)';
COMMENT ON COLUMN scholarship_applications.i20_document_status IS 'Status do I-20: pending ou sent';
COMMENT ON COLUMN scholarship_applications.i20_document_sent_at IS 'Data em que o I-20 foi enviado ao aluno';
