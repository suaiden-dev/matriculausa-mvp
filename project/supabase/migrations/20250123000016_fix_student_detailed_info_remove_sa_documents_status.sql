-- Migration: Fix get_student_detailed_info function - remove sa.documents_status
-- This fixes the column sa.documents_status does not exist error

-- Drop existing function first
DROP FUNCTION IF EXISTS get_student_detailed_info(uuid);

-- Create the function without sa.documents_status reference
CREATE OR REPLACE FUNCTION get_student_detailed_info(target_student_id uuid)
RETURNS TABLE (
  student_id uuid,
  full_name text,
  email text,
  phone text,
  country text,
  field_of_interest text,
  academic_level text,
  gpa numeric,
  english_proficiency text,
  registration_date timestamptz,
  current_status text,
  seller_referral_code text,
  seller_name text,
  total_fees_paid numeric,
  fees_count numeric,
  scholarship_title text,
  university_name text,
  selected_scholarship_id uuid,
  documents_status text,
  is_application_fee_paid boolean,
  is_scholarship_fee_paid boolean,
  has_paid_selection_process_fee boolean,
  has_paid_i20_control_fee boolean,
  student_process_type text,
  application_status text
) AS $$
BEGIN
  RETURN QUERY
  WITH student_profile AS (
    SELECT 
      up.user_id,
      up.id as profile_id,
      COALESCE(up.full_name, '') as full_name,
      COALESCE(up.email, '') as email,
      COALESCE(up.phone, '') as phone,
      COALESCE(up.country, 'Country not available') as country,
      COALESCE(up.field_of_interest, 'Field not specified') as field_of_interest,
      COALESCE(up.academic_level, 'Level not specified') as academic_level,
      COALESCE(up.gpa, 0::numeric) as gpa,
      COALESCE(up.english_proficiency, 'Not specified') as english_proficiency,
      up.created_at as registration_date,
      COALESCE(up.status, 'pending') as current_status,
      COALESCE(up.seller_referral_code, '') as seller_referral_code,
      COALESCE(up.documents_status, 'pending') as documents_status,
      COALESCE(up.has_paid_selection_process_fee, false) as has_paid_selection_process_fee,
      COALESCE(up.has_paid_i20_control_fee, false) as has_paid_i20_control_fee,
      up.selected_scholarship_id
    FROM user_profiles up
    WHERE up.user_id = target_student_id
  ),
  seller_info AS (
    SELECT 
      COALESCE(s.name, 'Seller not found') as seller_name
    FROM sellers s
    WHERE s.referral_code = (SELECT sp.seller_referral_code FROM student_profile sp)
  ),
  payment_info AS (
    SELECT 
      COALESCE(SUM(sct.amount), 0)::numeric as total_fees_paid,
      COALESCE(COUNT(*), 0)::numeric as fees_count
    FROM stripe_connect_transfers sct
    WHERE sct.user_id = target_student_id
  ),
  scholarship_info AS (
    SELECT 
      COALESCE(s.title, 'Scholarship not specified') as scholarship_title,
      COALESCE(u.name, 'University not specified') as university_name,
      COALESCE(sa.is_application_fee_paid, false) as is_application_fee_paid,
      COALESCE(sa.is_scholarship_fee_paid, false) as is_scholarship_fee_paid,
      COALESCE(sa.status, 'pending') as application_status
    FROM scholarship_applications sa
    JOIN scholarships s ON sa.scholarship_id = s.id
    JOIN universities u ON s.university_id = u.id
    WHERE sa.student_id = (SELECT sp.profile_id FROM student_profile sp)
    ORDER BY sa.created_at DESC
    LIMIT 1
  )
  SELECT 
    sp.user_id,
    sp.full_name,
    sp.email,
    sp.phone,
    sp.country,
    sp.field_of_interest,
    sp.academic_level,
    sp.gpa,
    sp.english_proficiency,
    sp.registration_date,
    sp.current_status,
    sp.seller_referral_code,
    COALESCE(si.seller_name, 'Seller not found'),
    COALESCE(pi.total_fees_paid, 0::numeric),
    COALESCE(pi.fees_count, 0::numeric),
    COALESCE(schi.scholarship_title, 'Scholarship not specified'),
    COALESCE(schi.university_name, 'University not specified'),
    sp.selected_scholarship_id,
    sp.documents_status, -- Use only from user_profiles
    COALESCE(schi.is_application_fee_paid, false),
    COALESCE(schi.is_scholarship_fee_paid, false),
    sp.has_paid_selection_process_fee,
    sp.has_paid_i20_control_fee,
    'Not specified'::text,
    COALESCE(schi.application_status, 'pending')
  FROM student_profile sp
  LEFT JOIN seller_info si ON true
  LEFT JOIN payment_info pi ON true
  LEFT JOIN scholarship_info schi ON true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_student_detailed_info(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_student_detailed_info(uuid) IS 'Fixed function without sa.documents_status reference';