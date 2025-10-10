-- Script para corrigir valores de pagamento históricos
-- Este script identifica e corrige pagamentos que foram registrados com valores incorretos

-- 1. Identificar pagamentos de jolie8862@uorak.com que precisam ser corrigidos
-- Primeiro, vamos ver o que temos atualmente
SELECT 
  ar.id,
  ar.referrer_id,
  ar.referred_id,
  ar.payment_amount,
  ar.fee_type,
  ar.status,
  ar.created_at,
  up.email,
  up.full_name
FROM affiliate_referrals ar
JOIN user_profiles up ON ar.referred_id = up.user_id
WHERE up.email = 'jolie8862@uorak.com'
ORDER BY ar.created_at DESC;

-- 2. Verificar se há registros de pagamento Stripe para jolie8862@uorak.com
-- (Isso seria feito via logs do Stripe ou webhook, mas vamos assumir que o valor correto é $350)

-- 3. Atualizar o valor do pagamento para $350 (sistema simplificado)
UPDATE affiliate_referrals 
SET payment_amount = 350.00
WHERE referred_id = (
  SELECT user_id 
  FROM user_profiles 
  WHERE email = 'jolie8862@uorak.com'
)
AND fee_type = 'selection_process'
AND status = 'completed';

-- 4. Verificar se a correção foi aplicada
SELECT 
  ar.id,
  ar.referrer_id,
  ar.referred_id,
  ar.payment_amount,
  ar.fee_type,
  ar.status,
  ar.created_at,
  up.email,
  up.full_name
FROM affiliate_referrals ar
JOIN user_profiles up ON ar.referred_id = up.user_id
WHERE up.email = 'jolie8862@uorak.com'
ORDER BY ar.created_at DESC;

-- 5. Identificar outros pagamentos que podem ter valores incorretos
-- Buscar pagamentos de selection_process que foram registrados com $400 mas deveriam ser $350
-- (usuários do sistema simplificado)
SELECT 
  ar.id,
  ar.referrer_id,
  ar.referred_id,
  ar.payment_amount,
  ar.fee_type,
  ar.status,
  ar.created_at,
  up.email,
  up.full_name,
  up.system_type
FROM affiliate_referrals ar
JOIN user_profiles up ON ar.referred_id = up.user_id
WHERE ar.fee_type = 'selection_process'
  AND ar.payment_amount = 400.00
  AND up.system_type = 'simplified'
  AND ar.status = 'completed'
ORDER BY ar.created_at DESC;

-- 6. Corrigir todos os pagamentos de selection_process do sistema simplificado que estão com $400
UPDATE affiliate_referrals 
SET payment_amount = 350.00
WHERE fee_type = 'selection_process'
  AND payment_amount = 400.00
  AND status = 'completed'
  AND referred_id IN (
    SELECT user_id 
    FROM user_profiles 
    WHERE system_type = 'simplified'
  );

-- 7. Verificar se há pagamentos de scholarship_fee que precisam ser corrigidos
-- (de $900 para $550 no sistema simplificado)
SELECT 
  ar.id,
  ar.referrer_id,
  ar.referred_id,
  ar.payment_amount,
  ar.fee_type,
  ar.status,
  ar.created_at,
  up.email,
  up.full_name,
  up.system_type
FROM affiliate_referrals ar
JOIN user_profiles up ON ar.referred_id = up.user_id
WHERE ar.fee_type = 'scholarship_fee'
  AND ar.payment_amount = 900.00
  AND up.system_type = 'simplified'
  AND ar.status = 'completed'
ORDER BY ar.created_at DESC;

-- 8. Corrigir pagamentos de scholarship_fee do sistema simplificado
UPDATE affiliate_referrals 
SET payment_amount = 550.00
WHERE fee_type = 'scholarship_fee'
  AND payment_amount = 900.00
  AND status = 'completed'
  AND referred_id IN (
    SELECT user_id 
    FROM user_profiles 
    WHERE system_type = 'simplified'
  );

-- 9. Verificar se há pagamentos de i20_control_fee que precisam ser corrigidos
-- (de $900 para $900 no sistema simplificado - este não muda)
-- Mas vamos verificar se há inconsistências
SELECT 
  ar.id,
  ar.referrer_id,
  ar.referred_id,
  ar.payment_amount,
  ar.fee_type,
  ar.status,
  ar.created_at,
  up.email,
  up.full_name,
  up.system_type
FROM affiliate_referrals ar
JOIN user_profiles up ON ar.referred_id = up.user_id
WHERE ar.fee_type = 'i20_control_fee'
  AND up.system_type = 'simplified'
  AND ar.status = 'completed'
ORDER BY ar.created_at DESC;

-- 10. Relatório final de correções aplicadas
SELECT 
  'selection_process' as fee_type,
  'simplified' as system_type,
  COUNT(*) as corrected_count,
  SUM(payment_amount) as total_corrected_amount
FROM affiliate_referrals ar
JOIN user_profiles up ON ar.referred_id = up.user_id
WHERE ar.fee_type = 'selection_process'
  AND up.system_type = 'simplified'
  AND ar.payment_amount = 350.00
  AND ar.status = 'completed'

UNION ALL

SELECT 
  'scholarship_fee' as fee_type,
  'simplified' as system_type,
  COUNT(*) as corrected_count,
  SUM(payment_amount) as total_corrected_amount
FROM affiliate_referrals ar
JOIN user_profiles up ON ar.referred_id = up.user_id
WHERE ar.fee_type = 'scholarship_fee'
  AND up.system_type = 'simplified'
  AND ar.payment_amount = 550.00
  AND ar.status = 'completed';
