-- Migration: Fix Simplified System - Scholarship Fee, Application Fee, and Acceptance Letter
-- This corrects the issue where scholarship_fee_paid, application_fee_paid, and acceptance_letter
-- are not showing for Simplified system (Affiliate Admin and Seller) when students have multiple applications
-- Problem: LEFT JOIN returns only first application, missing paid applications
-- Solution: Return multiple rows (one per application) and let frontend aggregate

-- Drop existing function
DROP FUNCTION IF EXISTS get_admin_students_analytics(uuid);

-- Recreate function with multiple applications support
CREATE OR REPLACE FUNCTION get_admin_students_analytics(admin_user_id uuid)
RETURNS TABLE (
  student_id uuid,
  profile_id uuid,
  user_id uuid,
  student_name text,
  student_email text,
  country text,
  referred_by_seller_id uuid,
  seller_name text,
  seller_referral_code text,
  referral_code_used text,
  total_paid numeric,
  created_at timestamptz,
  status text,
  application_status text,
  system_type text,
  has_paid_selection_process_fee boolean,
  has_paid_i20_control_fee boolean,
  is_scholarship_fee_paid boolean,
  is_application_fee_paid boolean,
  -- ✅ NOVO: Campos para múltiplas aplicações
  application_id uuid,
  scholarship_id uuid,
  scholarship_title text,
  university_name text,
  university_id uuid,
  acceptance_letter_status text,
  acceptance_letter_sent_at timestamptz,
  acceptance_letter_url text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.user_id as student_id,
    up.id as profile_id,
    up.user_id as user_id,
    COALESCE(up.full_name, 'Nome não disponível') as student_name,
    COALESCE(u.email, up.email, 'Email não disponível') as student_email,
    COALESCE(up.country, 'País não disponível') as country,
    s.id as referred_by_seller_id,
    COALESCE(s.name, 'Vendedor não disponível') as seller_name,
    COALESCE(s.referral_code, '') as seller_referral_code,
    COALESCE(up.seller_referral_code, '') as referral_code_used,
    
    -- ✅ CORREÇÃO: Cálculo de total_paid agora considera scholarship_applications
    (
      -- Selection Process Fee (com dependentes se não houver override)
      CASE 
        WHEN up.has_paid_selection_process_fee = true THEN
          COALESCE(
            (SELECT selection_process_fee FROM get_user_fee_overrides(up.user_id)),
            CASE
              WHEN COALESCE(up.system_type, 'legacy') = 'simplified' THEN 350
              ELSE 400 + (COALESCE(up.dependents, 0) * 150)
            END
          )
        ELSE 0
      END
      
      + 
      
      -- ✅ CORREÇÃO: Scholarship Fee agora prioriza scholarship_applications
      CASE
        WHEN COALESCE(sa.is_scholarship_fee_paid, up.is_scholarship_fee_paid, false) = true THEN
          COALESCE(
            (SELECT scholarship_fee FROM get_user_fee_overrides(up.user_id)),
            CASE
              WHEN COALESCE(up.system_type, 'legacy') = 'simplified' THEN 550
              ELSE 900
            END
          )
        ELSE 0
      END
      
      +
      
      -- I-20 Control Fee (sem dependentes, sempre 900, com override)
      CASE
        WHEN up.has_paid_i20_control_fee = true THEN
          COALESCE(
            (SELECT i20_control_fee FROM get_user_fee_overrides(up.user_id)),
            900
          )
        ELSE 0
      END
    ) as total_paid,
    
    up.created_at,
    COALESCE(up.status, 'active') as status,
    COALESCE(sa.status, 'Not specified') as application_status,
    COALESCE(up.system_type, 'legacy') as system_type,
    COALESCE(up.has_paid_selection_process_fee, false) as has_paid_selection_process_fee,
    COALESCE(up.has_paid_i20_control_fee, false) as has_paid_i20_control_fee,
    
    -- ✅ CORREÇÃO CRÍTICA: Priorizar scholarship_applications sobre user_profiles
    -- Isso garante que se QUALQUER aplicação foi paga, será detectada
    COALESCE(sa.is_scholarship_fee_paid, up.is_scholarship_fee_paid, false) as is_scholarship_fee_paid,
    COALESCE(sa.is_application_fee_paid, up.is_application_fee_paid, false) as is_application_fee_paid,
    
    -- ✅ NOVO: Campos de aplicação individual para suportar múltiplas aplicações
    sa.id as application_id,
    sa.scholarship_id,
    sch.title as scholarship_title,
    uni.name as university_name,
    uni.id as university_id,
    sa.acceptance_letter_status,
    sa.acceptance_letter_sent_at,
    sa.acceptance_letter_url
    
  FROM user_profiles up
  JOIN auth.users u ON up.user_id = u.id
  JOIN sellers s ON up.seller_referral_code = s.referral_code
  JOIN affiliate_admins aa ON s.affiliate_admin_id = aa.id
  
  -- ✅ CORREÇÃO: LEFT JOIN mantido para capturar TODAS as aplicações
  -- Agora retorna múltiplas linhas por aluno se houver múltiplas aplicações
  LEFT JOIN scholarship_applications sa ON sa.student_id = up.id
  LEFT JOIN scholarships sch ON sa.scholarship_id = sch.id
  LEFT JOIN universities uni ON sch.university_id = uni.id
  
  WHERE aa.user_id = admin_user_id
    AND up.seller_referral_code IS NOT NULL
    AND up.seller_referral_code != ''
    AND s.is_active = true
  
  -- ✅ Ordenar por data de criação do estudante e depois da aplicação
  ORDER BY up.created_at DESC, sa.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_admin_students_analytics(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_admin_students_analytics(uuid) IS 
'Returns student analytics with support for multiple applications per student. 
Fixes Simplified system issue where scholarship_fee_paid, application_fee_paid, 
and acceptance_letter were not showing when students had multiple applications.
Now returns one row per application, allowing frontend to aggregate correctly.';

