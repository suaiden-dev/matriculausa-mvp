-- Função RPC para consolidar todas as queries de AdminStudentDetails em uma única chamada
-- Isso reduz drasticamente o número de requests HTTP
CREATE OR REPLACE FUNCTION get_admin_student_full_details(target_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', up.id,
    'user_id', up.user_id,
    'full_name', up.full_name,
    'email', up.email,
    'phone', up.phone,
    'country', up.country,
    'field_of_interest', up.field_of_interest,
    'academic_level', up.academic_level,
    'gpa', up.gpa,
    'english_proficiency', up.english_proficiency,
    'status', up.status,
    'avatar_url', up.avatar_url,
    'dependents', up.dependents,
    'desired_scholarship_range', up.desired_scholarship_range,
    'created_at', up.created_at,
    'has_paid_selection_process_fee', up.has_paid_selection_process_fee,
    'has_paid_i20_control_fee', up.has_paid_i20_control_fee,
    'selection_process_fee_payment_method', up.selection_process_fee_payment_method,
    'i20_control_fee_payment_method', up.i20_control_fee_payment_method,
    'role', up.role,
    'seller_referral_code', up.seller_referral_code,
    'admin_notes', up.admin_notes,
    'scholarship_applications', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', sa.id,
            'scholarship_id', sa.scholarship_id,
            'status', sa.status,
            'applied_at', sa.applied_at,
            'is_application_fee_paid', sa.is_application_fee_paid,
            'is_scholarship_fee_paid', sa.is_scholarship_fee_paid,
            'application_fee_payment_method', sa.application_fee_payment_method,
            'scholarship_fee_payment_method', sa.scholarship_fee_payment_method,
            'acceptance_letter_status', sa.acceptance_letter_status,
            'acceptance_letter_url', sa.acceptance_letter_url,
            'acceptance_letter_sent_at', sa.acceptance_letter_sent_at,
            'acceptance_letter_signed_at', sa.acceptance_letter_signed_at,
            'acceptance_letter_approved_at', sa.acceptance_letter_approved_at,
            'transfer_form_url', sa.transfer_form_url,
            'transfer_form_status', sa.transfer_form_status,
            'transfer_form_sent_at', sa.transfer_form_sent_at,
            'student_process_type', sa.student_process_type,
            'payment_status', sa.payment_status,
            'reviewed_at', sa.reviewed_at,
            'reviewed_by', sa.reviewed_by,
            'documents', sa.documents,
            'created_at', sa.created_at,
            'scholarships', CASE 
              WHEN s.id IS NOT NULL THEN jsonb_build_object(
                'title', s.title,
                'university_id', s.university_id,
                'field_of_study', s.field_of_study,
                'annual_value_with_scholarship', s.annual_value_with_scholarship,
                'application_fee_amount', s.application_fee_amount,
                'universities', CASE 
                  WHEN u.id IS NOT NULL THEN jsonb_build_object(
                    'name', u.name
                  )
                  ELSE NULL
                END
              )
              ELSE NULL
            END
          )
          ORDER BY 
            CASE sa.status 
              WHEN 'enrolled' THEN 1
              WHEN 'approved' THEN 2
              ELSE 3
            END,
            sa.created_at DESC
        )
        FROM scholarship_applications sa
        LEFT JOIN scholarships s ON sa.scholarship_id = s.id
        LEFT JOIN universities u ON s.university_id = u.id
        WHERE sa.student_id = up.id
      ),
      '[]'::jsonb
    )
  ) INTO result
  FROM user_profiles up
  WHERE up.id = target_profile_id;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- Comentário explicativo
COMMENT ON FUNCTION get_admin_student_full_details(uuid) IS 
'Consolida todas as queries de AdminStudentDetails em uma única chamada RPC, reduzindo drasticamente o número de requests HTTP. Retorna os mesmos dados que a query original com joins.';

