-- Translation SaaS v2 — colunas faltantes
-- Ref: docs/tasks-translation-saas-v2.md (T03–T06)

-- TASK-T03: source em document_request_uploads
ALTER TABLE public.document_request_uploads
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT NULL;
-- Valores: 'student_upload' | 'admin_upload' | 'translation_resubmit'

-- TASK-T04: translation_order_id em document_request_uploads
-- FK para rastrear qual order gerou o resubmit automático
ALTER TABLE public.document_request_uploads
  ADD COLUMN IF NOT EXISTS translation_order_id UUID DEFAULT NULL
    REFERENCES public.translation_orders(id) ON DELETE SET NULL;

-- TASK-T05: novos campos em translation_orders
ALTER TABLE public.translation_orders
  ADD COLUMN IF NOT EXISTS document_request_upload_id UUID DEFAULT NULL
    REFERENCES public.document_request_uploads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_origin BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS resubmit_upload_id UUID DEFAULT NULL
    REFERENCES public.document_request_uploads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resubmitted_at TIMESTAMPTZ DEFAULT NULL;

-- TASK-T06: translation_disclaimer_accepted em user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS translation_disclaimer_accepted BOOLEAN DEFAULT FALSE;

-- Índice para buscar uploads pendentes de tradução por usuário
CREATE INDEX IF NOT EXISTS idx_document_request_uploads_rejection_reason
  ON public.document_request_uploads (rejection_reason)
  WHERE rejection_reason IS NOT NULL;

-- Índice para buscar orders com vínculo de resubmit
CREATE INDEX IF NOT EXISTS idx_translation_orders_document_request_upload_id
  ON public.translation_orders (document_request_upload_id)
  WHERE document_request_upload_id IS NOT NULL;
