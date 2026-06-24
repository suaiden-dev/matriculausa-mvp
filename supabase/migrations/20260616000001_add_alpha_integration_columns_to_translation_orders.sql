-- Adiciona colunas de integração Alpha Translations + Matricula USA
-- à tabela translation_orders existente.

-- Vínculos com document_request_uploads e document_requests
ALTER TABLE public.translation_orders
  ADD COLUMN IF NOT EXISTS upload_id UUID REFERENCES public.document_request_uploads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS document_request_id UUID REFERENCES public.document_requests(id) ON DELETE SET NULL;

-- Metadados de pagamento (PayPal/Zelle)
ALTER TABLE public.translation_orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  ADD COLUMN IF NOT EXISTS payment_metadata JSONB;

-- Zelle
ALTER TABLE public.translation_orders
  ADD COLUMN IF NOT EXISTS zelle_receipt_url TEXT,
  ADD COLUMN IF NOT EXISTS zelle_status TEXT
    CHECK (zelle_status IN ('pending_verification', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS zelle_confirmation_code TEXT;

-- Alpha Translations
ALTER TABLE public.translation_orders
  ADD COLUMN IF NOT EXISTS alpha_project_number INT UNIQUE,
  ADD COLUMN IF NOT EXISTS alpha_project_status TEXT,
  ADD COLUMN IF NOT EXISTS translation_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS alpha_synced_at TIMESTAMPTZ;

-- Entrega (60 dias a partir de certified_at)
ALTER TABLE public.translation_orders
  ADD COLUMN IF NOT EXISTS certified_files JSONB,
  ADD COLUMN IF NOT EXISTS certified_at TIMESTAMPTZ;

-- Índices
CREATE INDEX IF NOT EXISTS idx_translation_orders_alpha_project_number
  ON public.translation_orders (alpha_project_number)
  WHERE alpha_project_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_translation_orders_translation_status
  ON public.translation_orders (translation_status);

CREATE INDEX IF NOT EXISTS idx_translation_orders_payment_status
  ON public.translation_orders (payment_status);

-- Índice parcial: traduções em andamento
CREATE INDEX IF NOT EXISTS idx_translation_orders_in_progress
  ON public.translation_orders (user_id, created_at DESC)
  WHERE translation_status NOT IN ('Finalizado', 'Cancelado');

CREATE INDEX IF NOT EXISTS idx_translation_orders_upload_id
  ON public.translation_orders (upload_id)
  WHERE upload_id IS NOT NULL;
