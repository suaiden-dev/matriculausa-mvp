-- 🔒 CRIAR TABELA DE LOCKS PARA WORKER
-- Evita execuções simultâneas do email-queue-worker

CREATE TABLE IF NOT EXISTS public.worker_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lock_key TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_worker_locks_key_active 
ON public.worker_locks(lock_key, is_active);

CREATE INDEX IF NOT EXISTS idx_worker_locks_created_at 
ON public.worker_locks(created_at);

-- RLS (Row Level Security) - permitir acesso apenas para service role
ALTER TABLE public.worker_locks ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso total para service role
DROP POLICY IF EXISTS "Service role can manage worker locks" ON public.worker_locks;
CREATE POLICY "Service role can manage worker locks" ON public.worker_locks
FOR ALL USING (true);

-- Comentários para documentação
COMMENT ON TABLE public.worker_locks IS 'Tabela para controlar locks de execução do worker e evitar execuções simultâneas';
COMMENT ON COLUMN public.worker_locks.lock_key IS 'Chave única do lock (ex: email_worker_lock)';
COMMENT ON COLUMN public.worker_locks.is_active IS 'Se o lock está ativo';
COMMENT ON COLUMN public.worker_locks.expires_at IS 'Quando o lock expira (opcional)';
COMMENT ON COLUMN public.worker_locks.metadata IS 'Metadados adicionais do lock';
