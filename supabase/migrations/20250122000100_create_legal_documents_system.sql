-- =====================================================
-- Migration: Sistema de Documentos Legais (PDF + Email)
-- =====================================================
-- Cria sistema completo para geração automática de PDFs legais quando:
-- 1. Usuário aceita termos no registro (terms_of_service, privacy_policy)
-- 2. Pagamento é confirmado (Zelle verificado OU Stripe pago) - gera PDF do checkout_terms aceito
-- 3. Usuário paga Selection Process Fee
-- PDFs são salvos no Storage e enviados para info@matriculausa.com
-- NOTA: checkout_terms não gera PDF no aceite, apenas após pagamento confirmado
-- =====================================================

-- 1. Criar tabela de auditoria para documentos legais gerados
-- =====================================================

CREATE TABLE IF NOT EXISTS public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('term_acceptance', 'selection_process_contract', 'registration_terms')),
  related_id uuid NOT NULL, -- ID do term acceptance, reference do pagamento, ou user_id para registration_terms
  storage_path text NOT NULL,
  filename text NOT NULL,
  email_sent boolean DEFAULT false,
  email_sent_at timestamptz,
  email_error text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_legal_documents_user_id ON public.legal_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_documents_document_type ON public.legal_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_legal_documents_related_id ON public.legal_documents(related_id);
CREATE INDEX IF NOT EXISTS idx_legal_documents_created_at ON public.legal_documents(created_at DESC);

-- RLS Policies
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes antes de criar (para tornar migration idempotente)
DROP POLICY IF EXISTS "Admins can view all legal documents" ON public.legal_documents;
DROP POLICY IF EXISTS "Service role can insert legal documents" ON public.legal_documents;
DROP POLICY IF EXISTS "Service role can update legal documents" ON public.legal_documents;
DROP POLICY IF EXISTS "Users can view own legal documents" ON public.legal_documents;

-- Admins podem ver todos os documentos
DROP POLICY IF EXISTS "Admins can view all legal documents" ON public.legal_documents;
CREATE POLICY "Admins can view all legal documents"
  ON public.legal_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Sistema pode inserir documentos
DROP POLICY IF EXISTS "Service role can insert legal documents" ON public.legal_documents;
CREATE POLICY "Service role can insert legal documents"
  ON public.legal_documents
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Sistema pode atualizar documentos (para status de email)
DROP POLICY IF EXISTS "Service role can update legal documents" ON public.legal_documents;
CREATE POLICY "Service role can update legal documents"
  ON public.legal_documents
  FOR UPDATE
  TO service_role
  USING (true);

COMMENT ON TABLE public.legal_documents IS 'Registro de todos os documentos legais (PDFs) gerados automaticamente pelo sistema';
COMMENT ON COLUMN public.legal_documents.document_type IS 'Tipo: term_acceptance (aceite de termos), selection_process_contract (contrato de Selection Process) ou registration_terms (termos de registro - terms_of_service + privacy_policy)';
COMMENT ON COLUMN public.legal_documents.related_id IS 'ID do registro relacionado (term_acceptance_id ou payment_reference)';
COMMENT ON COLUMN public.legal_documents.metadata IS 'Dados adicionais: {student_name, payment_amount, payment_method, ip_address, etc}';

-- =====================================================
-- 2. Adicionar configurações ao system_settings
-- =====================================================

-- Inserir configurações (apenas se não existirem)
INSERT INTO public.system_settings(key, value)
VALUES 
  ('legal_pdf_edge_function_url', 'https://fitpynguasqqutuhzifx.supabase.co/functions/v1/generate-legal-pdf'),
  ('legal_pdf_recipient_email', 'info@matriculausa.com')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 3. Função de orquestração (chama Edge Function via pg_net)
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_legal_document_generation()
RETURNS TRIGGER AS $$
DECLARE
  service_key TEXT;
  edge_function_url TEXT;
  request_body JSONB;
  doc_type TEXT;  -- Renomear para evitar conflito com coluna
  related_id_var UUID;  -- Renomear para evitar conflito com coluna
  user_id_param UUID;
BEGIN
  -- Determinar tipo de documento baseado na tabela
  IF TG_TABLE_NAME = 'comprehensive_term_acceptance' THEN
    -- Processar apenas terms_of_service e privacy_policy (termos de registro)
    -- checkout_terms será processado APÓS o pagamento ser confirmado
    IF NEW.term_type NOT IN ('terms_of_service', 'privacy_policy') THEN
      RETURN NEW;
    END IF;
    
    -- Verificar se ambos os termos de registro já foram aceitos
    -- Se sim, gerar um único PDF com tipo 'registration_terms'
    IF EXISTS (
      SELECT 1 FROM public.comprehensive_term_acceptance cta1
      WHERE cta1.user_id = NEW.user_id
      AND cta1.term_type = 'terms_of_service'
    ) AND EXISTS (
      SELECT 1 FROM public.comprehensive_term_acceptance cta2
      WHERE cta2.user_id = NEW.user_id
      AND cta2.term_type = 'privacy_policy'
    ) THEN
      -- Ambos os termos foram aceitos, gerar PDF único
      doc_type := 'registration_terms';
      related_id_var := NEW.user_id; -- Usar user_id como related_id para registration_terms
      user_id_param := NEW.user_id;
      
      -- Verificar se já existe documento registration_terms para este usuário (idempotência)
      IF EXISTS (
        SELECT 1 FROM public.legal_documents ld
        WHERE ld.user_id = user_id_param
        AND ld.document_type = 'registration_terms'
      ) THEN
        RAISE LOG 'Documento registration_terms já existe para user_id: %', user_id_param;
        RETURN NEW;
      END IF;
    ELSE
      -- Ainda não temos ambos os termos, não gerar PDF ainda
      RETURN NEW;
    END IF;
    
  ELSIF TG_TABLE_NAME = 'user_profiles' THEN
    doc_type := 'selection_process_contract';
    related_id_var := NEW.id; -- Usar profile ID como referência
    user_id_param := NEW.user_id; -- Usar user_id do auth.users, não o id do perfil
    
    -- Só processar quando Selection Process é pago pela primeira vez
    IF NEW.has_paid_selection_process_fee = true AND 
       (OLD.has_paid_selection_process_fee IS NULL OR OLD.has_paid_selection_process_fee = false) THEN
      -- Continuar processamento
      NULL;
    ELSE
      RETURN NEW;
    END IF;
    
  ELSIF TG_TABLE_NAME = 'zelle_payments' THEN
    -- Processar quando pagamento Zelle é verificado/aprovado
    doc_type := 'term_acceptance';
    related_id_var := NEW.id; -- Usar payment_id como related_id
    user_id_param := NEW.user_id;
    
    -- Só processar quando status muda para 'verified' ou 'approved'
    IF (NEW.status = 'verified' OR NEW.status = 'approved') AND
       (OLD.status IS NULL OR (OLD.status != 'verified' AND OLD.status != 'approved')) THEN
      -- Verificar se há checkout_terms aceito para este usuário
      -- (a Edge Function buscará o último checkout_terms aceito)
      IF NOT EXISTS (
        SELECT 1 FROM public.comprehensive_term_acceptance
        WHERE user_id = NEW.user_id
        AND term_type = 'checkout_terms'
      ) THEN
        -- Não há termos aceitos, não gerar PDF
        RAISE LOG 'Nenhum checkout_terms encontrado para user_id: %, pagamento: %', NEW.user_id, NEW.id;
        RETURN NEW;
      END IF;
      -- Continuar processamento
      NULL;
    ELSE
      RETURN NEW;
    END IF;
    
  ELSIF TG_TABLE_NAME = 'individual_fee_payments' THEN
    -- Processar quando pagamento Stripe é inserido (via INSERT)
    doc_type := 'term_acceptance';
    related_id_var := NEW.id; -- Usar payment_id como related_id
    user_id_param := NEW.user_id;
    
    -- Só processar pagamentos Stripe (não Zelle, pois Zelle já tem trigger próprio)
    IF NEW.payment_method = 'stripe' THEN
      -- Verificar se há checkout_terms aceito para este usuário
      -- (a Edge Function buscará o último checkout_terms aceito)
      IF NOT EXISTS (
        SELECT 1 FROM public.comprehensive_term_acceptance
        WHERE user_id = NEW.user_id
        AND term_type = 'checkout_terms'
        AND accepted_at <= COALESCE(NEW.payment_date, NOW())
      ) THEN
        -- Não há termos aceitos, não gerar PDF
        RAISE LOG 'Nenhum checkout_terms encontrado para user_id: %, pagamento Stripe: %', NEW.user_id, NEW.id;
        RETURN NEW;
      END IF;
      -- Continuar processamento
      NULL;
    ELSE
      -- Não é Stripe, não processar (Zelle já tem trigger próprio)
      RETURN NEW;
    END IF;
    
  ELSE
    -- Tabela não suportada
    RETURN NEW;
  END IF;

  -- Verificar se documento já foi gerado (idempotência)
  IF EXISTS (
    SELECT 1 FROM public.legal_documents ld
    WHERE ld.user_id = user_id_param
    AND ld.document_type = doc_type
    AND ld.related_id = related_id_var
  ) THEN
    RAISE LOG 'Documento legal já existe para user_id: %, tipo: %, related_id: %', user_id_param, doc_type, related_id_var;
    RETURN NEW;
  END IF;

  -- Buscar configurações
  BEGIN
    SELECT value INTO service_key 
    FROM public.system_settings 
    WHERE key = 'service_role_key';
    
    SELECT value INTO edge_function_url 
    FROM public.system_settings 
    WHERE key = 'legal_pdf_edge_function_url';
    
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erro ao buscar configurações do system_settings: %', SQLERRM;
    RETURN NEW; -- Não falhar a transação principal
  END;

  -- Construir payload
  request_body := jsonb_build_object(
    'type', doc_type,
    'user_id', user_id_param,
    'related_id', related_id_var,
    'trigger_table', TG_TABLE_NAME,
    'triggered_at', now()
  );

  -- Chamar Edge Function de forma assíncrona via pg_net
  BEGIN
    PERFORM net.http_post(
      url := COALESCE(edge_function_url, 'https://fitpynguasqqutuhzifx.supabase.co/functions/v1/generate-legal-pdf'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(service_key, '')
      ),
      body := request_body
    );
    
    RAISE LOG 'Edge Function chamada com sucesso para gerar PDF legal: tipo=%, user_id=%, related_id=%', 
              doc_type, user_id_param, related_id_var;
              
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erro ao chamar Edge Function para gerar PDF: %', SQLERRM;
    -- Não falhar a transação principal - PDF será gerado em retry posterior
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_legal_document_generation() IS 
  'Orquestra geração de PDFs legais chamando Edge Function via pg_net quando usuário aceita termos de registro, pagamento é confirmado (Zelle/Stripe) ou paga Selection Process';

-- =====================================================
-- 4. Trigger para aceite de termos (comprehensive_term_acceptance)
-- =====================================================

DROP TRIGGER IF EXISTS trigger_term_acceptance_pdf ON public.comprehensive_term_acceptance;

CREATE OR REPLACE TRIGGER trigger_term_acceptance_pdf
  AFTER INSERT ON public.comprehensive_term_acceptance
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_legal_document_generation();

COMMENT ON TRIGGER trigger_term_acceptance_pdf ON public.comprehensive_term_acceptance IS
  'Dispara geração de PDF quando usuário aceita termos de registro (terms_of_service ou privacy_policy)';

-- =====================================================
-- 5. Trigger para pagamento de Selection Process (user_profiles)
-- =====================================================

DROP TRIGGER IF EXISTS trigger_selection_process_payment_pdf ON public.user_profiles;

CREATE OR REPLACE TRIGGER trigger_selection_process_payment_pdf
  AFTER UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_legal_document_generation();

COMMENT ON TRIGGER trigger_selection_process_payment_pdf ON public.user_profiles IS
  'Dispara geração de PDF de contrato quando Selection Process Fee é pago';

-- =====================================================
-- 5b. Trigger para pagamentos Zelle confirmados (zelle_payments)
-- =====================================================

DROP TRIGGER IF EXISTS trigger_zelle_payment_pdf ON public.zelle_payments;

CREATE OR REPLACE TRIGGER trigger_zelle_payment_pdf
  AFTER UPDATE ON public.zelle_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_legal_document_generation();

COMMENT ON TRIGGER trigger_zelle_payment_pdf ON public.zelle_payments IS
  'Dispara geração de PDF de checkout_terms quando pagamento Zelle é verificado/aprovado';

-- =====================================================
-- 5c. Trigger para pagamentos Stripe confirmados (individual_fee_payments)
-- =====================================================

DROP TRIGGER IF EXISTS trigger_stripe_payment_pdf ON public.individual_fee_payments;

CREATE OR REPLACE TRIGGER trigger_stripe_payment_pdf
  AFTER INSERT ON public.individual_fee_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_legal_document_generation();

COMMENT ON TRIGGER trigger_stripe_payment_pdf ON public.individual_fee_payments IS
  'Dispara geração de PDF de checkout_terms quando pagamento Stripe é inserido (confirmado)';

-- =====================================================
-- 6. Função helper para verificar status de documentos legais
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_legal_documents(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  document_type text,
  filename text,
  storage_path text,
  email_sent boolean,
  email_sent_at timestamptz,
  created_at timestamptz,
  metadata jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ld.id,
    ld.document_type,
    ld.filename,
    ld.storage_path,
    ld.email_sent,
    ld.email_sent_at,
    ld.created_at,
    ld.metadata
  FROM public.legal_documents ld
  WHERE ld.user_id = p_user_id
  ORDER BY ld.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_legal_documents(uuid) IS
  'Retorna todos os documentos legais gerados para um usuário específico';

-- =====================================================
-- 7. Grants de permissões
-- =====================================================

-- Permitir que authenticated users vejam seus próprios documentos
GRANT SELECT ON public.legal_documents TO authenticated;

-- Permitir que service_role gerencie documentos
GRANT ALL ON public.legal_documents TO service_role;

-- =====================================================
-- Finalização
-- =====================================================

DO $$ 
BEGIN 
  RAISE NOTICE '✅ Sistema de Documentos Legais instalado com sucesso!';
  RAISE NOTICE '📋 Tabela legal_documents criada';
  RAISE NOTICE '🔧 Triggers instalados em comprehensive_term_acceptance e user_profiles';
  RAISE NOTICE '🚀 Próximo passo: Deploy da Edge Function generate-legal-pdf';
  RAISE NOTICE '📦 Próximo passo: Criar bucket legal-documents no Storage';
END $$;
