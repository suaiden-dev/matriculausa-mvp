-- =====================================================
-- Script de ROLLBACK Manual: Sistema de Documentos Legais
-- =====================================================
-- Execute este script no SQL Editor do Supabase Dashboard
-- se precisar reverter o sistema de documentos legais
-- 
-- ATENÇÃO: Este script irá:
-- - Remover todos os triggers
-- - Remover a função de orquestração
-- - Remover a função helper
-- - Remover a tabela legal_documents e TODOS os dados
-- - Remover configurações do system_settings (opcional)
-- 
-- ⚠️  BACKUP RECOMENDADO: Faça backup dos dados antes de executar!
-- =====================================================

-- =====================================================
-- PASSO 1: Verificar o que será removido
-- =====================================================

-- Verificar triggers existentes
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%legal%' 
OR trigger_name LIKE '%pdf%'
OR event_object_table IN ('comprehensive_term_acceptance', 'user_profiles', 'zelle_payments', 'individual_fee_payments');

-- Verificar documentos existentes (se quiser fazer backup)
SELECT COUNT(*) as total_documentos FROM public.legal_documents;

-- Verificar funções existentes
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname IN ('handle_legal_document_generation', 'get_user_legal_documents');

-- =====================================================
-- PASSO 2: Fazer backup dos dados (OPCIONAL mas RECOMENDADO)
-- =====================================================

-- Descomente para fazer backup antes de remover:
/*
CREATE TABLE IF NOT EXISTS legal_documents_backup AS 
SELECT * FROM public.legal_documents;

-- Verificar backup
SELECT COUNT(*) as total_backup FROM legal_documents_backup;
*/

-- =====================================================
-- PASSO 3: Remover Triggers
-- =====================================================

DROP TRIGGER IF EXISTS trigger_term_acceptance_pdf ON public.comprehensive_term_acceptance;
DROP TRIGGER IF EXISTS trigger_selection_process_payment_pdf ON public.user_profiles;
DROP TRIGGER IF EXISTS trigger_zelle_payment_pdf ON public.zelle_payments;
DROP TRIGGER IF EXISTS trigger_stripe_payment_pdf ON public.individual_fee_payments;

-- =====================================================
-- PASSO 4: Remover Funções
-- =====================================================

DROP FUNCTION IF EXISTS public.handle_legal_document_generation() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_legal_documents(uuid) CASCADE;

-- =====================================================
-- PASSO 5: Remover Políticas RLS
-- =====================================================

DROP POLICY IF EXISTS "Admins can view all legal documents" ON public.legal_documents;
DROP POLICY IF EXISTS "Service role can insert legal documents" ON public.legal_documents;
DROP POLICY IF EXISTS "Service role can update legal documents" ON public.legal_documents;
DROP POLICY IF EXISTS "Users can view own legal documents" ON public.legal_documents;

-- =====================================================
-- PASSO 6: Remover Grants
-- =====================================================

DO $$
BEGIN
  REVOKE SELECT ON public.legal_documents FROM authenticated;
  REVOKE ALL ON public.legal_documents FROM service_role;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

-- =====================================================
-- PASSO 7: Remover Índices
-- =====================================================

DROP INDEX IF EXISTS public.idx_legal_documents_user_id;
DROP INDEX IF EXISTS public.idx_legal_documents_document_type;
DROP INDEX IF EXISTS public.idx_legal_documents_related_id;
DROP INDEX IF EXISTS public.idx_legal_documents_created_at;

-- =====================================================
-- PASSO 8: Remover Tabela (⚠️ DELETA TODOS OS DADOS!)
-- =====================================================

DROP TABLE IF EXISTS public.legal_documents CASCADE;

-- =====================================================
-- PASSO 9: Remover Configurações (OPCIONAL)
-- =====================================================

-- Descomente se quiser remover as configurações também:
/*
DELETE FROM public.system_settings 
WHERE key IN (
  'legal_pdf_edge_function_url',
  'legal_pdf_recipient_email'
);
*/

-- NOTA: NÃO removemos 'supabase_service_key' pois pode ser usado por outros sistemas

-- =====================================================
-- PASSO 10: Verificar Rollback
-- =====================================================

-- Verificar se triggers foram removidos
SELECT 
  trigger_name,
  event_object_table
FROM information_schema.triggers 
WHERE trigger_name LIKE '%legal%' 
OR trigger_name LIKE '%pdf%';
-- Deve retornar 0 linhas

-- Verificar se tabela foi removida
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'legal_documents'
);
-- Deve retornar false

-- Verificar se funções foram removidas
SELECT 
  proname as function_name
FROM pg_proc 
WHERE proname IN ('handle_legal_document_generation', 'get_user_legal_documents');
-- Deve retornar 0 linhas

-- =====================================================
-- FIM DO ROLLBACK
-- =====================================================

DO $$ 
BEGIN 
  RAISE NOTICE '';
  RAISE NOTICE '✅ Rollback concluído com sucesso!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 O que foi removido:';
  RAISE NOTICE '   - Todos os triggers';
  RAISE NOTICE '   - Função handle_legal_document_generation()';
  RAISE NOTICE '   - Função get_user_legal_documents()';
  RAISE NOTICE '   - Tabela legal_documents (com todos os dados)';
  RAISE NOTICE '   - Políticas RLS';
  RAISE NOTICE '   - Índices';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  ATENÇÃO: Todos os PDFs e registros foram perdidos!';
  RAISE NOTICE '   Se fez backup, restaure usando:';
  RAISE NOTICE '   INSERT INTO public.legal_documents SELECT * FROM legal_documents_backup;';
END $$;
