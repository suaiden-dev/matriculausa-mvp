-- =====================================================
-- Migration ROLLBACK: Sistema de Documentos Legais
-- =====================================================
-- Esta migration desfaz TODAS as alterações feitas em
-- 20250122000100_create_legal_documents_system.sql
-- 
-- ATENÇÃO: Esta migration irá:
-- - Remover todos os triggers
-- - Remover a função de orquestração
-- - Remover a função helper
-- - Remover a tabela legal_documents e todos os dados
-- - Remover configurações do system_settings
-- 
-- Use apenas se precisar reverter completamente o sistema
-- =====================================================

-- =====================================================
-- 1. Remover Triggers
-- =====================================================

-- Remover trigger de comprehensive_term_acceptance
DROP TRIGGER IF EXISTS trigger_term_acceptance_pdf ON public.comprehensive_term_acceptance;

-- Remover trigger de user_profiles
DROP TRIGGER IF EXISTS trigger_selection_process_payment_pdf ON public.user_profiles;

-- Remover trigger de zelle_payments
DROP TRIGGER IF EXISTS trigger_zelle_payment_pdf ON public.zelle_payments;

-- Remover trigger de individual_fee_payments
DROP TRIGGER IF EXISTS trigger_stripe_payment_pdf ON public.individual_fee_payments;

-- =====================================================
-- 2. Remover Funções
-- =====================================================

-- Remover função de orquestração
DROP FUNCTION IF EXISTS public.handle_legal_document_generation() CASCADE;

-- Remover função helper
DROP FUNCTION IF EXISTS public.get_user_legal_documents(uuid) CASCADE;

-- =====================================================
-- 3. Remover Políticas RLS da tabela legal_documents
-- =====================================================

-- Remover todas as políticas RLS (se a tabela ainda existir)
DO $$
BEGIN
  -- Remover política de admins
  DROP POLICY IF EXISTS "Admins can view all legal documents" ON public.legal_documents;
  
  -- Remover política de service role insert
  DROP POLICY IF EXISTS "Service role can insert legal documents" ON public.legal_documents;
  
  -- Remover política de service role update
  DROP POLICY IF EXISTS "Service role can update legal documents" ON public.legal_documents;
  
  -- Remover política de usuários (se existir)
  DROP POLICY IF EXISTS "Users can view own legal documents" ON public.legal_documents;
END $$;

-- =====================================================
-- 4. Remover Grants de Permissões
-- =====================================================

-- Remover grants (se a tabela ainda existir)
DO $$
BEGIN
  REVOKE SELECT ON public.legal_documents FROM authenticated;
  REVOKE ALL ON public.legal_documents FROM service_role;
EXCEPTION
  WHEN undefined_table THEN
    -- Tabela não existe, continuar
    NULL;
END $$;

-- =====================================================
-- 5. Remover Índices
-- =====================================================

-- Remover índices (se a tabela ainda existir)
DROP INDEX IF EXISTS public.idx_legal_documents_user_id;
DROP INDEX IF EXISTS public.idx_legal_documents_document_type;
DROP INDEX IF EXISTS public.idx_legal_documents_related_id;
DROP INDEX IF EXISTS public.idx_legal_documents_created_at;

-- =====================================================
-- 6. Remover Tabela legal_documents
-- =====================================================
-- ATENÇÃO: Isso irá deletar TODOS os dados da tabela!
-- Certifique-se de fazer backup antes se necessário

DROP TABLE IF EXISTS public.legal_documents CASCADE;

-- =====================================================
-- 7. Remover Configurações do system_settings
-- =====================================================
-- Opcional: Descomente se quiser remover as configurações também

-- DELETE FROM public.system_settings 
-- WHERE key IN (
--   'legal_pdf_edge_function_url',
--   'legal_pdf_recipient_email'
-- );

-- NOTA: NÃO removemos 'supabase_service_key' pois pode ser usado por outros sistemas

-- =====================================================
-- Finalização
-- =====================================================

DO $$ 
BEGIN 
  RAISE NOTICE '✅ Rollback do Sistema de Documentos Legais concluído!';
  RAISE NOTICE '📋 Todos os triggers foram removidos';
  RAISE NOTICE '🔧 Todas as funções foram removidas';
  RAISE NOTICE '🗑️  Tabela legal_documents foi removida (com todos os dados)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  ATENÇÃO: Todos os PDFs e registros foram perdidos!';
  RAISE NOTICE '   Se precisar dos dados, restaure de um backup antes de executar esta migration.';
END $$;
