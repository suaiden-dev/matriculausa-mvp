-- Script para investigar o problema do usuário saioa7769@uorak.com
-- ID: 02c8c51b-ad78-43af-93e1-4d162ebb82bf

-- 1. Verificar se o usuário existe na tabela auth.users
SELECT 
    id,
    email,
    raw_user_meta_data,
    created_at,
    last_sign_in_at
FROM auth.users 
WHERE id = '02c8c51b-ad78-43af-93e1-4d162ebb82bf'
   OR email = 'saioa7769@uorak.com';

-- 2. Verificar se existe perfil na tabela user_profiles
SELECT 
    id,
    user_id,
    full_name,
    email,
    is_application_fee_paid,
    is_scholarship_fee_paid,
    has_paid_selection_process_fee,
    selected_scholarship_id,
    documents_status,
    created_at,
    updated_at
FROM user_profiles 
WHERE user_id = '02c8c51b-ad78-43af-93e1-4d162ebb82bf'
   OR email = 'saioa7769@uorak.com';

-- 3. Verificar se existe aplicação na tabela scholarship_applications
SELECT 
    id,
    student_id,
    scholarship_id,
    status,
    applied_at,
    payment_status,
    is_application_fee_paid,
    is_scholarship_fee_paid,
    student_process_type,
    created_at,
    updated_at
FROM scholarship_applications 
WHERE student_id = '02c8c51b-ad78-43af-93e1-4d162ebb82bf';

-- 4. Verificar se existe registro no carrinho
SELECT 
    id,
    user_id,
    scholarship_id,
    created_at
FROM user_cart 
WHERE user_id = '02c8c51b-ad78-43af-93e1-4d162ebb82bf';

-- 5. Verificar se existe histórico de pagamentos Stripe
SELECT 
    id,
    user_id,
    amount,
    status,
    payment_intent_id,
    created_at
FROM stripe_connect_transfers 
WHERE user_id = '02c8c51b-ad78-43af-93e1-4d162ebb82bf';

-- 6. Verificar se existe algum log de erro ou atividade
SELECT 
    id,
    admin_user_id,
    action,
    target_type,
    target_id,
    details,
    created_at
FROM admin_logs 
WHERE target_id = '02c8c51b-ad78-43af-93e1-4d162ebb82bf'
   OR details::text LIKE '%02c8c51b-ad78-43af-93e1-4d162ebb82bf%'
   OR details::text LIKE '%saioa7769@uorak.com%';

-- 7. Verificar se o usuário tem alguma bolsa selecionada
SELECT 
    s.id as scholarship_id,
    s.title,
    s.amount,
    u.name as university_name
FROM scholarships s
JOIN universities u ON s.university_id = u.id
WHERE s.id IN (
    SELECT selected_scholarship_id 
    FROM user_profiles 
    WHERE user_id = '02c8c51b-ad78-43af-93e1-4d162ebb82bf'
);

-- 8. Verificar se há algum problema com o email (case sensitivity)
SELECT 
    id,
    email,
    raw_user_meta_data
FROM auth.users 
WHERE LOWER(email) = LOWER('saioa7769@uorak.com');

-- 9. Verificar se há aplicações com status estranhos
SELECT 
    COUNT(*) as total_applications,
    status,
    payment_status
FROM scholarship_applications 
GROUP BY status, payment_status
ORDER BY status, payment_status;

-- 10. Verificar se há usuários sem aplicações
SELECT 
    COUNT(*) as users_without_applications
FROM user_profiles up
LEFT JOIN scholarship_applications sa ON up.user_id = sa.student_id
WHERE sa.id IS NULL
  AND up.role = 'student';
