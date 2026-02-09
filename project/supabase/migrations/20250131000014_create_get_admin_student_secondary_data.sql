-- Função RPC para consolidar todas as queries secundárias de AdminStudentDetails em uma única chamada
-- Isso reduz múltiplas queries para 1 request
CREATE OR REPLACE FUNCTION get_admin_student_secondary_data(
  target_user_id uuid,
  referral_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  term_acceptances jsonb;
  referral_info jsonb;
  real_paid_amounts jsonb;
BEGIN
  -- 1. Buscar term acceptances com joins
  SELECT COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', cta.id,
          'user_id', cta.user_id,
          'term_id', cta.term_id,
          'term_type', cta.term_type,
          'accepted_at', cta.accepted_at,
          'ip_address', cta.ip_address,
          'user_agent', cta.user_agent,
          'created_at', cta.created_at,
          'identity_photo_path', cta.identity_photo_path,
          'identity_photo_name', cta.identity_photo_name,
          'identity_photo_status', cta.identity_photo_status,
          'identity_photo_rejection_reason', cta.identity_photo_rejection_reason,
          'identity_photo_reviewed_at', cta.identity_photo_reviewed_at,
          'identity_photo_reviewed_by', cta.identity_photo_reviewed_by,
          'user_email', COALESCE(up.email, 'N/A'),
          'user_full_name', COALESCE(up.full_name, 'N/A'),
          'term_title', COALESCE(at.title, 'N/A'),
          'term_content', COALESCE(at.content, '')
        )
        ORDER BY cta.accepted_at DESC
      )
      FROM comprehensive_term_acceptance cta
      LEFT JOIN user_profiles up ON cta.user_id = up.user_id
      LEFT JOIN application_terms at ON cta.term_id = at.id
      WHERE cta.user_id = target_user_id
    ),
    '[]'::jsonb
  ) INTO term_acceptances;

  -- 2. Buscar referral info (consolidado) - usando subquery para melhor controle
  IF referral_code IS NOT NULL THEN
    -- Matricula Rewards (MATR codes)
    IF referral_code ~* '^MATR' THEN
      SELECT COALESCE(
        (
          SELECT jsonb_build_object(
            'type', 'student',
            'name', up.full_name,
            'email', up.email,
            'isRewards', true
          )
          FROM affiliate_codes ac
          LEFT JOIN user_profiles up ON ac.user_id = up.user_id
          WHERE ac.code = referral_code
          LIMIT 1
        ),
        'null'::jsonb
      ) INTO referral_info;
    ELSE
      -- Tentar seller primeiro
      SELECT COALESCE(
        (
          SELECT jsonb_build_object(
            'type', 'seller',
            'name', s.name,
            'email', s.email,
            'affiliateName', aff_up.full_name,
            'affiliateEmail', aff_up.email
          )
          FROM sellers s
          LEFT JOIN affiliate_admins aa ON s.affiliate_admin_id = aa.id
          LEFT JOIN user_profiles aff_up ON aa.user_id = aff_up.user_id
          WHERE s.referral_code = referral_code
          LIMIT 1
        ),
        -- Tentar used_referral_codes
        COALESCE(
          (
            SELECT jsonb_build_object(
              'type', 'student',
              'name', up.full_name,
              'email', up.email
            )
            FROM used_referral_codes urc
            LEFT JOIN user_profiles up ON urc.referrer_id = up.id
            WHERE urc.affiliate_code = referral_code
            LIMIT 1
          ),
          -- Tentar affiliate_referrals
          COALESCE(
            (
              SELECT jsonb_build_object(
                'type', 'affiliate',
                'name', up.full_name,
                'email', up.email
              )
              FROM affiliate_referrals ar
              LEFT JOIN user_profiles up ON ar.referrer_id = up.id
              WHERE ar.affiliate_code = referral_code
              LIMIT 1
            ),
            'null'::jsonb
          )
        )
      ) INTO referral_info;
    END IF;
  ELSE
    SELECT 'null'::jsonb INTO referral_info;
  END IF;

  -- 3. Buscar real paid amounts
  SELECT COALESCE(
    (
      SELECT jsonb_object_agg(
        CASE ifp.fee_type
          WHEN 'selection_process' THEN 'selection_process'
          WHEN 'application' THEN 'application'
          WHEN 'scholarship' THEN 'scholarship'
          WHEN 'i20_control' THEN 'i20_control'
          ELSE ifp.fee_type
        END,
        ifp.amount::numeric
      )
      FROM individual_fee_payments ifp
      WHERE ifp.user_id = target_user_id
    ),
    '{}'::jsonb
  ) INTO real_paid_amounts;

  -- Construir resultado consolidado
  SELECT jsonb_build_object(
    'term_acceptances', term_acceptances,
    'referral_info', referral_info,
    'real_paid_amounts', real_paid_amounts
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Comentário explicativo
COMMENT ON FUNCTION get_admin_student_secondary_data(uuid, text) IS 
'Consolida todas as queries secundárias de AdminStudentDetails (term acceptances, referral info, real paid amounts) em uma única chamada RPC, reduzindo múltiplas queries para 1 request.';

