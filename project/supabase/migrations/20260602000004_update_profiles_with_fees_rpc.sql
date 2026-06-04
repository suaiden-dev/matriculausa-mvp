-- Migration: update_profiles_with_fees_rpc
-- Description: Drop and recreate get_affiliate_admin_profiles_with_fees to include has_paid_reinstatement_package, has_paid_ds160_package, and has_paid_i539_cos_package in the returned columns.

DROP FUNCTION IF EXISTS public.get_affiliate_admin_profiles_with_fees(uuid);

CREATE OR REPLACE FUNCTION public.get_affiliate_admin_profiles_with_fees(admin_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  profile_id uuid,
  has_paid_selection_process_fee boolean,
  has_paid_i20_control_fee boolean,
  is_scholarship_fee_paid boolean,
  is_application_fee_paid boolean,
  is_placement_fee_paid boolean,
  dependents integer,
  seller_referral_code text,
  system_type text,
  full_name text,
  email text,
  created_at timestamp with time zone,
  student_process_type text,
  visa_transfer_active boolean,
  placement_fee_flow boolean,
  has_paid_reinstatement_package boolean,
  has_paid_ds160_package boolean,
  has_paid_i539_cos_package boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.user_id,
    up.id as profile_id,
    up.has_paid_selection_process_fee,
    up.has_paid_i20_control_fee,
    COALESCE(
      EXISTS (
        SELECT 1 FROM scholarship_applications sa 
        WHERE sa.student_id = up.id 
        AND sa.is_scholarship_fee_paid = true
      ),
      up.is_scholarship_fee_paid,
      false
    ) as is_scholarship_fee_paid,
    COALESCE(
      EXISTS (
        SELECT 1 FROM scholarship_applications sa 
        WHERE sa.student_id = up.id 
        AND sa.is_application_fee_paid = true
      ),
      up.is_application_fee_paid,
      false
    ) as is_application_fee_paid,
    COALESCE(up.is_placement_fee_paid, false) as is_placement_fee_paid,
    up.dependents,
    up.seller_referral_code,
    COALESCE(up.system_type, 'legacy') as system_type,
    up.full_name,
    up.email,
    up.created_at,
    up.student_process_type,
    up.visa_transfer_active,
    COALESCE(up.placement_fee_flow, false) as placement_fee_flow,
    COALESCE(up.has_paid_reinstatement_package, false) as has_paid_reinstatement_package,
    COALESCE(up.has_paid_ds160_package, false) as has_paid_ds160_package,
    COALESCE(up.has_paid_i539_cos_package, false) as has_paid_i539_cos_package
  FROM user_profiles up
  JOIN sellers s ON up.seller_referral_code = s.referral_code
  JOIN affiliate_admins aa ON s.affiliate_admin_id = aa.id
  WHERE aa.user_id = admin_user_id
    AND up.seller_referral_code IS NOT NULL
    AND up.seller_referral_code != ''
    AND s.is_active = true;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.get_affiliate_admin_profiles_with_fees(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_affiliate_admin_profiles_with_fees(uuid) TO service_role;
