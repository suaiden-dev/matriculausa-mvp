/*
  Adiciona suporte para o aluno enviar comprovante de que enviou
  o Transfer Form para sua escola atual.

  Novas colunas em scholarship_applications:
  - transfer_proof_to_school_url: URL do comprovante (imagem/PDF)
  - transfer_proof_to_school_at: quando o aluno fez o upload
  - transfer_proof_to_school_status: pending | submitted | viewed
*/

ALTER TABLE scholarship_applications
  ADD COLUMN IF NOT EXISTS transfer_proof_to_school_url TEXT,
  ADD COLUMN IF NOT EXISTS transfer_proof_to_school_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS transfer_proof_to_school_status TEXT DEFAULT 'pending'
    CHECK (transfer_proof_to_school_status IN ('pending', 'submitted', 'viewed'));
