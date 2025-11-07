-- Migration: Fix RPC to check scholarship_applications for legacy students
-- This fixes the bug where legacy students' scholarship fees are not identified

CREATE OR REPLACE FUNCTION get_affiliate_admin_profiles_with_fees(admin_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  profile_id uuid,
  has_paid_selection_process_fee boolean,
  has_paid_i20_control_fee boolean,
  is_scholarship_fee_paid boolean,
  is_application_fee_paid boolean,
  dependents integer,
  seller_referral_code text,
  system_type text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.user_id,
    up.id as profile_id,
    up.has_paid_selection_process_fee,
    up.has_paid_i20_control_fee,
    -- ✅ CORREÇÃO: Verificar scholarship_applications para TODOS os estudantes (legacy e simplified)
    -- Para simplified, já verificava. Para legacy, agora também verifica.
    COALESCE(
      EXISTS (
        SELECT 1 FROM scholarship_applications sa 
        WHERE sa.student_id = up.id 
        AND sa.is_scholarship_fee_paid = true
      ),
      up.is_scholarship_fee_paid,
      false
    ) as is_scholarship_fee_paid,
    -- ✅ CORREÇÃO: Verificar application fee também para TODOS os estudantes
    COALESCE(
      EXISTS (
        SELECT 1 FROM scholarship_applications sa 
        WHERE sa.student_id = up.id 
        AND sa.is_application_fee_paid = true
      ),
      up.is_application_fee_paid,
      false
    ) as is_application_fee_paid,
    up.dependents,
    up.seller_referral_code,
    COALESCE(up.system_type, 'legacy') as system_type
  FROM user_profiles up
  JOIN sellers s ON up.seller_referral_code = s.referral_code
  JOIN affiliate_admins aa ON s.affiliate_admin_id = aa.id
  WHERE aa.user_id = admin_user_id
    AND up.seller_referral_code IS NOT NULL
    AND up.seller_referral_code != ''
    AND s.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_affiliate_admin_profiles_with_fees(uuid) TO authenticated;

-- Update comment
COMMENT ON FUNCTION get_affiliate_admin_profiles_with_fees(uuid) IS 'Returns affiliate admin profiles with correct fee flags calculated from ALL scholarship applications. Fixed to check scholarship_applications for both legacy and simplified students.';

