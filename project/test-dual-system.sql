-- Test script para verificar o sistema dual
-- Execute este script no Supabase SQL Editor para diagnosticar problemas

-- 1. Verificar affiliate_admins e seus system_type
SELECT 
  aa.id,
  aa.user_id,
  aa.email,
  aa.system_type,
  up.full_name,
  up.role
FROM affiliate_admins aa
LEFT JOIN user_profiles up ON aa.user_id = up.user_id
ORDER BY aa.created_at DESC;

-- 2. Verificar sellers e seus admins
SELECT 
  s.id as seller_id,
  s.name as seller_name,
  s.email as seller_email,
  s.referral_code,
  s.is_active,
  aa.system_type as admin_system_type,
  aa.email as admin_email
FROM sellers s
JOIN affiliate_admins aa ON s.affiliate_admin_id = aa.id
ORDER BY s.created_at DESC;

-- 3. Testar a função RPC para affiliate admins
SELECT 
  'Testing RPC for affiliate admins' as test_type,
  get_affiliate_admin_system_type(aa.user_id) as system_type,
  aa.email,
  aa.system_type as db_system_type
FROM affiliate_admins aa
LIMIT 5;

-- 4. Verificar se há dados de system_settings para simplified
SELECT 
  key,
  value,
  description
FROM system_settings 
WHERE key LIKE 'simplified_%'
ORDER BY key;

-- 5. Verificar se há affiliate admins com system_type = 'simplified'
SELECT 
  COUNT(*) as simplified_admins_count
FROM affiliate_admins 
WHERE system_type = 'simplified';

-- 6. Verificar se há affiliate admins com system_type = 'legacy'
SELECT 
  COUNT(*) as legacy_admins_count
FROM affiliate_admins 
WHERE system_type = 'legacy';
