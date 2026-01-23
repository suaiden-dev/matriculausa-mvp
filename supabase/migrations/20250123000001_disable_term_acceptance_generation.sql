-- =====================================================
-- Migration: Desabilitar geração de term_acceptance
-- =====================================================
-- Remove a geração automática de PDFs do tipo 'term_acceptance'
-- quando pagamentos são confirmados (Zelle/Stripe).
-- Apenas 'selection_process_contract' será gerado quando a taxa for paga.
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_legal_document_generation()
RETURNS TRIGGER AS $$
DECLARE
  service_key TEXT;
  edge_function_url TEXT;
  request_body JSONB;
  doc_type TEXT;
  related_id_var UUID;
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
    -- ✅ DESABILITADO: Não gerar mais term_acceptance para pagamentos Zelle
    -- Apenas selection_process_contract será gerado quando a taxa for paga
    RAISE LOG 'Geração de term_acceptance desabilitada para pagamento Zelle: user_id=%, payment_id=%', NEW.user_id, NEW.id;
    RETURN NEW;
    
  ELSIF TG_TABLE_NAME = 'individual_fee_payments' THEN
    -- ✅ DESABILITADO: Não gerar mais term_acceptance para pagamentos Stripe
    -- Apenas selection_process_contract será gerado quando a taxa for paga
    RAISE LOG 'Geração de term_acceptance desabilitada para pagamento Stripe: user_id=%, payment_id=%', NEW.user_id, NEW.id;
    RETURN NEW;
    
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
  'Orquestra geração de PDFs legais chamando Edge Function via pg_net quando usuário aceita termos de registro ou paga Selection Process. Geração de term_acceptance para pagamentos foi desabilitada.';
