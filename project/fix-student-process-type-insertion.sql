-- Script para corrigir a inserção do campo student_process_type
-- Execute este script no SQL Editor do Supabase Dashboard

-- 1. VERIFICAR SE O CAMPO EXISTE
SELECT 
  'Verificando se student_process_type existe' as step;

SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'scholarship_applications' 
  AND column_name = 'student_process_type';

-- 2. SE O CAMPO NÃO EXISTIR, ADICIONAR
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scholarship_applications' 
    AND column_name = 'student_process_type'
  ) THEN
    ALTER TABLE public.scholarship_applications ADD COLUMN student_process_type TEXT;
    RAISE NOTICE 'Campo student_process_type adicionado com sucesso';
  ELSE
    RAISE NOTICE 'Campo student_process_type já existe';
  END IF;
END $$;

-- 3. VERIFICAR APLICAÇÕES SEM student_process_type
SELECT 
  'Verificando aplicações sem student_process_type' as step;

SELECT 
  id,
  student_id,
  scholarship_id,
  status,
  created_at,
  'Sem student_process_type' as issue
FROM public.scholarship_applications 
WHERE student_process_type IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- 4. VERIFICAR SE HÁ DADOS NO localStorage DOS USUÁRIOS (via user_profiles)
SELECT 
  'Verificando se há dados relacionados nos perfis' as step;

SELECT 
  up.id,
  up.user_id,
  up.full_name,
  up.email,
  up.selected_scholarship_id,
  up.created_at,
  'Perfil com bolsa selecionada' as info
FROM user_profiles up
WHERE up.selected_scholarship_id IS NOT NULL
  AND up.role = 'student'
ORDER BY up.created_at DESC
LIMIT 10;

-- 5. VERIFICAR SE HÁ APLICAÇÕES DUPLICADAS
SELECT 
  'Verificando aplicações duplicadas' as step;

SELECT 
  student_id,
  scholarship_id,
  COUNT(*) as duplicate_count,
  array_agg(id) as application_ids,
  array_agg(created_at) as created_dates
FROM public.scholarship_applications 
GROUP BY student_id, scholarship_id 
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 6. VERIFICAR ESTRUTURA COMPLETA DA TABELA
SELECT 
  'Estrutura completa da tabela scholarship_applications' as step;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns 
WHERE table_name = 'scholarship_applications'
ORDER BY ordinal_position;

-- 7. VERIFICAR POLÍTICAS RLS
SELECT 
  'Verificando políticas RLS' as step;

SELECT 
  policyname,
  permissive,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'scholarship_applications';

-- 8. VERIFICAR SE HÁ TRIGGERS IMPEDINDO INSERÇÕES
SELECT 
  'Verificando triggers' as step;

SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'scholarship_applications';

-- 9. TESTAR INSERÇÃO DE UMA APLICAÇÃO DE TESTE
SELECT 
  'Testando inserção de aplicação de teste' as step;

-- Criar uma aplicação de teste para verificar se a inserção funciona
DO $$
DECLARE
  test_app_id UUID;
BEGIN
  -- Inserir aplicação de teste
  INSERT INTO public.scholarship_applications (
    student_id,
    scholarship_id,
    status,
    student_process_type,
    applied_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', -- ID de teste
    '00000000-0000-0000-0000-000000000000', -- ID de teste
    'pending',
    'initial',
    NOW()
  ) RETURNING id INTO test_app_id;
  
  RAISE NOTICE 'Aplicação de teste criada com ID: %', test_app_id;
  
  -- Verificar se foi criada
  IF test_app_id IS NOT NULL THEN
    RAISE NOTICE '✅ Inserção funcionando corretamente';
    
    -- Limpar aplicação de teste
    DELETE FROM public.scholarship_applications WHERE id = test_app_id;
    RAISE NOTICE '🧹 Aplicação de teste removida';
  ELSE
    RAISE NOTICE '❌ Erro na inserção';
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Erro na inserção: %', SQLERRM;
END $$;

-- 10. VERIFICAR LOGS DE ERRO RECENTES
SELECT 
  'Verificando logs de erro recentes' as step;

-- Esta consulta pode não funcionar dependendo da configuração do Supabase
-- Mas é útil para identificar problemas
SELECT 
  'Verifique os logs das Edge Functions no Supabase Dashboard' as info,
  'Especialmente stripe-checkout e stripe-checkout-application-fee' as detail;
