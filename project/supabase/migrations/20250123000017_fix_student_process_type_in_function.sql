-- Migration: Fix get_student_detailed_info function to return real student_process_type
-- This updates the function to properly fetch student_process_type from scholarship_applications table

CREATE OR REPLACE FUNCTION get_student_detailed_info(target_student_id uuid)
RETURNS TABLE (
  student_id uuid,
  profile_id uuid,
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
  fees_count bigint,
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
      up.full_name,
      up.email,
      up.phone,
      COALESCE(up.country, 'Country not available') as country,
      COALESCE(up.field_of_interest, 'Field not specified') as field_of_interest,
      COALESCE(up.academic_level, 'Level not specified') as academic_level,
      COALESCE(up.gpa, 0) as gpa,
      COALESCE(up.english_proficiency, 'Not specified') as english_proficiency,
      up.created_at as registration_date,
      up.status as current_status,
      up.seller_referral_code,
      up.documents,
      up.has_paid_selection_process_fee,
      up.has_paid_i20_control_fee,
      up.selected_scholarship_id
    FROM user_profiles up
    WHERE up.user_id = target_student_id
  ),
  seller_info AS (
    SELECT 
      s.name as seller_name
    FROM sellers s
    WHERE s.referral_code = (SELECT sp.seller_referral_code FROM student_profile sp)
  ),
  payment_info AS (
    SELECT 
      COALESCE(SUM(sct.amount)::numeric, 0) as total_fees_paid,
      COUNT(*) as fees_count
    FROM stripe_connect_transfers sct
    WHERE sct.user_id = target_student_id
  ),
  scholarship_info AS (
    SELECT 
      s.title as scholarship_title,
      u.name as university_name,
      sa.is_application_fee_paid,
      sa.is_scholarship_fee_paid,
      sa.status as application_status,
      sa.student_process_type
    FROM scholarship_applications sa
    JOIN scholarships s ON sa.scholarship_id = s.id
    JOIN universities u ON s.university_id = u.id
    WHERE sa.student_id = (SELECT sp.profile_id FROM student_profile sp)
    ORDER BY sa.created_at DESC
    LIMIT 1
  ),
  documents_status_calc AS (
    SELECT 
      CASE 
        WHEN COUNT(*) = 0 THEN 'no_documents'
        WHEN COUNT(*) FILTER (WHERE doc->>'status' = 'approved') = COUNT(*) THEN 'all_approved'
        WHEN COUNT(*) FILTER (WHERE doc->>'status' = 'rejected') > 0 THEN 'has_rejected'
        WHEN COUNT(*) FILTER (WHERE doc->>'status' = 'approved') > 0 THEN 'partially_approved'
        WHEN COUNT(*) FILTER (WHERE doc->>'status' = 'pending') = COUNT(*) THEN 'all_pending'
        ELSE 'under_review'
      END as calculated_status
    FROM student_profile sp,
    LATERAL jsonb_array_elements(sp.documents) AS doc
  )
  SELECT 
    sp.user_id as student_id,
    sp.profile_id as profile_id,
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
    COALESCE(si.seller_name, 'Seller not found') as seller_name,
    pi.total_fees_paid,
    pi.fees_count,
    COALESCE(schi.scholarship_title, 'Scholarship not specified') as scholarship_title,
    COALESCE(schi.university_name, 'University not specified') as university_name,
    sp.selected_scholarship_id,
    COALESCE(dsc.calculated_status, 'pending') as documents_status,
    COALESCE(schi.is_application_fee_paid, false) as is_application_fee_paid,
    COALESCE(schi.is_scholarship_fee_paid, false) as is_scholarship_fee_paid,
    sp.has_paid_selection_process_fee,
    sp.has_paid_i20_control_fee,
    COALESCE(schi.student_process_type, 'Not specified') as student_process_type,
    COALESCE(schi.application_status, 'pending') as application_status
  FROM student_profile sp
  LEFT JOIN seller_info si ON true
  LEFT JOIN payment_info pi ON true
  LEFT JOIN scholarship_info schi ON true
  LEFT JOIN documents_status_calc dsc ON true
  ORDER BY sp.registration_date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_student_detailed_info(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_student_detailed_info(uuid) IS 'Updated function to properly return student_process_type from scholarship_applications table';
