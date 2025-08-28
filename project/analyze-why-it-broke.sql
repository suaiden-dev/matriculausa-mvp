-- Script para analisar por que o sistema quebrou quando antes funcionava
-- Análise de possíveis causas

-- 1. VERIFICAR SE HÁ PROBLEMAS COM CONSTRAINTS OU POLÍTICAS RLS
SELECT 
    'Verificando constraints da tabela scholarship_applications' as step;

-- Verificar se há constraints que podem estar impedindo inserções
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'scholarship_applications'::regclass;

-- 2. VERIFICAR POLÍTICAS RLS
SELECT 
    'Verificando políticas RLS' as step;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'scholarship_applications';

-- 3. VERIFICAR SE HÁ TRIGGERS IMPEDINDO INSERÇÕES
SELECT 
    'Verificando triggers' as step;

SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'scholarship_applications';

-- 4. VERIFICAR SE HÁ PROBLEMAS COM A UNIQUE CONSTRAINT
SELECT 
    'Verificando constraint unique (student_id, scholarship_id)' as step;

-- Verificar se há registros duplicados que podem estar causando problemas
SELECT 
    student_id,
    scholarship_id,
    COUNT(*) as duplicate_count
FROM scholarship_applications 
GROUP BY student_id, scholarship_id 
HAVING COUNT(*) > 1;

-- 5. VERIFICAR SE HÁ PROBLEMAS COM OS TIPOS DE DADOS
SELECT 
    'Verificando tipos de dados' as step;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'scholarship_applications'
ORDER BY ordinal_position;

-- 6. VERIFICAR SE HÁ PROBLEMAS COM AS FUNÇÕES DE INSERÇÃO
SELECT 
    'Verificando funções relacionadas' as step;

-- Buscar por funções que podem estar relacionadas
SELECT 
    proname as function_name,
    prosrc as function_source
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND prosrc ILIKE '%scholarship_applications%'
  AND prosrc ILIKE '%INSERT%';

-- 7. VERIFICAR SE HÁ PROBLEMAS COM LOGS DE ERRO
SELECT 
    'Verificando logs de erro recentes' as step;

-- Verificar se há logs de erro relacionados
SELECT 
    id,
    admin_user_id,
    action,
    target_type,
    target_id,
    details,
    created_at
FROM admin_logs 
WHERE created_at > NOW() - INTERVAL '7 days'
  AND (action ILIKE '%error%' 
       OR action ILIKE '%fail%' 
       OR action ILIKE '%insert%'
       OR details::text ILIKE '%scholarship_applications%')
ORDER BY created_at DESC
LIMIT 20;

-- 8. VERIFICAR SE HÁ PROBLEMAS COM AS EDGE FUNCTIONS
SELECT 
    'Verificando se há problemas com Edge Functions' as step;

-- Verificar se há logs de erro nas funções
SELECT 
    'Verificar logs das Edge Functions no Supabase Dashboard' as note,
    'Funções a verificar:' as functions,
    'stripe-checkout-application-fee' as function1,
    'stripe-webhook' as function2,
    'verify-stripe-session' as function3;

-- 9. VERIFICAR SE HÁ PROBLEMAS COM O FLUXO DE PAGAMENTO
SELECT 
    'Verificando fluxo de pagamento' as step;

-- Verificar se há sessões Stripe pendentes ou com erro
SELECT 
    'Verificar no Stripe Dashboard:' as note,
    '1. Sessões de checkout com status failed' as check1,
    '2. Webhooks com erro' as check2,
    '3. Pagamentos com status pending' as check3;

-- 10. VERIFICAR SE HÁ PROBLEMAS COM O CÓDIGO FRONTEND
SELECT 
    'Verificando possíveis problemas no frontend' as step;

-- Verificar se há problemas com o carrinho
SELECT 
    COUNT(*) as total_cart_items,
    COUNT(DISTINCT user_id) as unique_users_with_cart
FROM user_cart;

-- 11. VERIFICAR SE HÁ PROBLEMAS COM O USUÁRIO ESPECÍFICO
SELECT 
    'Análise específica do usuário problemático' as step;

-- Verificar se há algo específico com esse usuário
SELECT 
    'Usuário ID:' as info,
    '02c8c51b-ad78-43af-93e1-4d162ebb82bf' as user_id,
    'Email:' as email_info,
    'saioa7769@uorak.com' as email;

-- Verificar se há algo estranho no perfil
SELECT 
    up.*,
    au.raw_user_meta_data,
    au.created_at as auth_created_at,
    au.last_sign_in_at
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id
WHERE up.user_id = '02c8c51b-ad78-43af-93e1-4d162ebb82bf';

-- 12. VERIFICAR SE HÁ PROBLEMAS COM MIGRAÇÕES RECENTES
SELECT 
    'Verificando migrações recentes' as step;

-- Listar migrações recentes que podem ter causado o problema
SELECT 
    'Verificar se alguma migração recente quebrou algo:' as note,
    '1. 20250128000000_add_payment_fields_to_applications.sql' as migration1,
    '2. Outras migrações executadas recentemente' as migration2;

-- 13. RECOMENDAÇÕES PARA RESOLVER
SELECT 
    'RECOMENDAÇÕES PARA RESOLVER:' as recommendations,
    '1. Executar a migração de campos de pagamento' as rec1,
    '2. Executar o script de correção do usuário' as rec2,
    '3. Verificar logs das Edge Functions' as rec3,
    '4. Verificar se há problemas no Stripe' as rec4,
    '5. Testar o fluxo completo com um usuário novo' as rec5;
