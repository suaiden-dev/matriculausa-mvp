-- Fix ambiguous column reference in get_suspicious_users

CREATE OR REPLACE FUNCTION get_suspicious_users()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  affiliate_code text,
  total_referrals bigint,
  total_earnings numeric,
  conversion_rate numeric,
  last_activity timestamptz,
  status text,
  flags text[]
) AS $$
BEGIN
  RETURN QUERY
  WITH agg AS (
    SELECT 
      u.id AS id,
      u.email::text AS email,
      COALESCE(up.full_name, u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) AS full_name,
      ac.code AS affiliate_code,
      ac.is_active AS is_active,
      COUNT(ar.id)::bigint AS total_referrals,
      COALESCE(mc.total_earned, 0) AS total_earnings,
      COUNT(ar.id) FILTER (WHERE ar.status = 'approved') AS approved_referrals,
      GREATEST(
        COALESCE(MAX(ar.created_at), to_timestamp(0)),
        COALESCE(up.last_active::timestamptz, to_timestamp(0)),
        COALESCE(u.last_sign_in_at, to_timestamp(0)),
        COALESCE(u.created_at, to_timestamp(0))
      ) AS last_activity
    FROM auth.users u
    LEFT JOIN user_profiles up ON up.user_id = u.id
    LEFT JOIN affiliate_codes ac ON ac.user_id = u.id
    LEFT JOIN affiliate_referrals ar ON ar.referrer_id = u.id
    LEFT JOIN matriculacoin_credits mc ON mc.user_id = u.id
    WHERE ac.id IS NOT NULL
    GROUP BY u.id, u.email, up.full_name, u.raw_user_meta_data, ac.code, ac.is_active, mc.total_earned, up.last_active, u.last_sign_in_at, u.created_at
  )
  SELECT 
    agg.id,
    agg.email,
    agg.full_name,
    agg.affiliate_code,
    agg.total_referrals,
    agg.total_earnings,
    CASE WHEN agg.total_referrals > 0 THEN ROUND((agg.approved_referrals::numeric / agg.total_referrals::numeric) * 100, 2) ELSE 0 END AS conversion_rate,
    agg.last_activity,
    CASE 
      WHEN agg.is_active = false THEN 'suspended'
      WHEN (agg.total_referrals >= 20 AND (agg.approved_referrals::numeric / NULLIF(agg.total_referrals,0)) > 0.8) THEN 'flagged'
      ELSE 'active'
    END AS status,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN agg.is_active = false THEN 'code_suspended' END,
      CASE WHEN agg.total_referrals >= 50 THEN 'high_volume' END,
      CASE WHEN agg.total_referrals >= 20 AND (agg.approved_referrals::numeric / NULLIF(agg.total_referrals,0)) > 0.8 THEN 'high_conversion' END
    ], NULL) AS flags
  FROM agg
  WHERE (agg.is_active = false) OR agg.total_referrals >= 20 OR (agg.approved_referrals::numeric / NULLIF(agg.total_referrals,0)) > 0.8
  ORDER BY status DESC, agg.total_referrals DESC, agg.total_earnings DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_suspicious_users() TO anon, authenticated, service_role;


