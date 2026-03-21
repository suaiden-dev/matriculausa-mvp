import fs from 'fs';
const env = fs.readFileSync('.env', 'utf-8');
const urlMatches = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatches = env.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/);

if (!urlMatches || !keyMatches) {
    console.error("No url or key");
    process.exit(1);
}

const url = urlMatches[1].trim();
const key = keyMatches[1].trim();

async function updateRpc() {
    const query = `
    CREATE OR REPLACE FUNCTION get_admin_student_full_details(target_profile_id uuid)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO public
    AS $$
    DECLARE
      result json;
    BEGIN
      SELECT row_to_json(q) INTO result
      FROM (
        SELECT 
          up.id,
          up.user_id,
          up.full_name,
          up.email,
          up.phone,
          up.country,
          up.field_of_interest,
          up.academic_level,
          up.gpa,
          up.english_proficiency,
          up.status,
          up.avatar_url,
          up.dependents,
          up.desired_scholarship_range,
          up.created_at,
          up.has_paid_selection_process_fee,
          up.has_paid_i20_control_fee,
          up.placement_fee_flow,
          up.is_placement_fee_paid,
          up.selection_process_fee_payment_method,
          up.i20_control_fee_payment_method,
          up.role,
          up.seller_referral_code,
          up.admin_notes,
          up.documents_status,
          (
            SELECT COALESCE(json_agg(
              json_build_object(
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
                'scholarships', (
                  SELECT json_build_object(
                    'title', s.title,
                    'university_id', s.university_id,
                    'field_of_study', s.field_of_study,
                    'annual_value_with_scholarship', s.annual_value_with_scholarship,
                    'application_fee_amount', s.application_fee_amount,
                    'universities', (
                      SELECT json_build_object('name', u.name)
                      FROM universities u WHERE u.id = s.university_id
                    )
                  )
                  FROM scholarships s WHERE s.id = sa.scholarship_id
                )
              )
            ), '[]'::json)
            FROM scholarship_applications sa
            WHERE sa.user_id = up.user_id
          ) as scholarship_applications
        FROM user_profiles up
        WHERE up.id = target_profile_id
      ) q;
      
      RETURN result;
    END;
    $$;
  `;

    const req = await fetch(`${url}/rest/v1/`, {
        method: 'POST',
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: query })
    });

    // Since we don't have direct access via POST /rest/v1/ to run DDL queries like this from the client safely via the RPC endpoint in the standard Supabase structure, we must wait for MCP execute_sql, or just use the fallback in the browser by modifying `.tsx` locally?
    // Wait, I can execute SQL through pg node directly or psql, using `DATABASE_URL`!
}
