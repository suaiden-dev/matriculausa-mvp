-- Atualiza a função get_student_detailed_info para incluir documentos e application_status
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
  application_status text,
  documents jsonb
) AS $$
BEGIN
  RETURN QUERY
  WITH student_docs AS (
    SELECT 
      sd.user_id,
      jsonb_agg(
        jsonb_build_object(
          'id', sd.id,
          'type', sd.type,
          'url', sd.file_url,
          'status', COALESCE(sd.status, 'pending'),
          'uploaded_at', sd.created_at,
          'name', sd.file_url
        )
      ) as documents
    FROM student_documents sd
    WHERE sd.user_id = target_student_id
    GROUP BY sd.user_id
  )
  SELECT 
    up.user_id as student_id,
    COALESCE(up.full_name, 'Name not available') as full_name,
    COALESCE(up.email, 'Email not available') as email,
    COALESCE(up.phone, 'Phone not available') as phone,
    COALESCE(up.country, 'Country not available') as country,
    COALESCE(up.field_of_interest, 'Field not specified') as field_of_interest,
    COALESCE(up.academic_level, 'Level not specified') as academic_level,
    COALESCE(up.gpa, 0) as gpa,
    COALESCE(up.english_proficiency, 'Not specified') as english_proficiency,
    COALESCE(up.created_at, now()) as registration_date,
    COALESCE(up.status, 'active') as current_status,
    COALESCE(up.seller_referral_code, '') as seller_referral_code,
    COALESCE(s.seller_name, 'Seller not available') as seller_name,
    COALESCE(SUM(sct.amount), 0) as total_fees_paid,
    COALESCE(COUNT(sct.id), 0)::bigint as fees_count,
    COALESCE(sch.title, 'Scholarship not specified') as scholarship_title,
    COALESCE(u.name, 'University not specified') as university_name,
    COALESCE(sa.scholarship_id, gen_random_uuid()) as selected_scholarship_id,
    COALESCE(up.documents_status, 'Not started') as documents_status,
    COALESCE(up.is_application_fee_paid, false) as is_application_fee_paid,
    COALESCE(up.is_scholarship_fee_paid, false) as is_scholarship_fee_paid,
    COALESCE(up.has_paid_selection_process_fee, false) as has_paid_selection_process_fee,
    COALESCE(up.has_paid_i20_control_fee, false) as has_paid_i20_control_fee,
    COALESCE(sa.student_process_type, 'Not specified') as student_process_type,
    COALESCE(sa.status, 'pending') as application_status,
    COALESCE(sd.documents, '[]'::jsonb) as documents
  FROM user_profiles up
  LEFT JOIN sellers s ON up.seller_referral_code = s.referral_code
  LEFT JOIN stripe_connect_transfers sct ON up.user_id = sct.user_id AND sct.status = 'succeeded'
  LEFT JOIN scholarship_applications sa ON up.user_id = sa.student_id
  LEFT JOIN scholarships sch ON sa.scholarship_id = sch.id
  LEFT JOIN universities u ON sch.university_id = u.id
  LEFT JOIN student_docs sd ON up.user_id = sd.user_id
  WHERE up.user_id = target_student_id
  GROUP BY 
    up.user_id, up.full_name, up.email, up.phone, up.country, 
    up.field_of_interest, up.academic_level, up.gpa, up.english_proficiency,
    up.created_at, up.status, up.seller_referral_code, s.seller_name,
    sch.title, u.name, sa.scholarship_id, up.documents_status,
    up.is_application_fee_paid, up.is_scholarship_fee_paid,
    up.has_paid_selection_process_fee, up.has_paid_i20_control_fee,
    sa.student_process_type, sa.status, sd.documents;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissões de execução
GRANT EXECUTE ON FUNCTION get_student_detailed_info(uuid) TO authenticated;
