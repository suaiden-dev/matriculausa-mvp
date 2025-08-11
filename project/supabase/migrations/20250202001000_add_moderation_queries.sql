-- Moderation helper RPCs for Matricula Rewards Admin

-- Suspicious users based on conversion anomalies and status of affiliate code
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
      u.id,
      u.email::text AS email,
      COALESCE(up.full_name, u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) AS full_name,
      ac.code AS affiliate_code,
      ac.is_active,
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
    id,
    email,
    full_name,
    affiliate_code,
    total_referrals,
    total_earnings,
    CASE WHEN total_referrals > 0 THEN ROUND((approved_referrals::numeric / total_referrals::numeric) * 100, 2) ELSE 0 END AS conversion_rate,
    last_activity,
    CASE 
      WHEN is_active = false THEN 'suspended'
      WHEN (total_referrals >= 20 AND (approved_referrals::numeric / NULLIF(total_referrals,0)) > 0.8) THEN 'flagged'
      ELSE 'active'
    END AS status,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN is_active = false THEN 'code_suspended' END,
      CASE WHEN total_referrals >= 50 THEN 'high_volume' END,
      CASE WHEN total_referrals >= 20 AND (approved_referrals::numeric / NULLIF(total_referrals,0)) > 0.8 THEN 'high_conversion' END
    ], NULL) AS flags
  FROM agg
  WHERE (is_active = false) OR total_referrals >= 20 OR (approved_referrals::numeric / NULLIF(total_referrals,0)) > 0.8
  ORDER BY status DESC, total_referrals DESC, total_earnings DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_suspicious_users() TO anon, authenticated, service_role;

-- Blocked affiliate codes list with audit info
CREATE OR REPLACE FUNCTION get_blocked_affiliate_codes()
RETURNS TABLE (
  id uuid,
  code text,
  user_id uuid,
  user_email text,
  blocked_at timestamptz,
  blocked_by text,
  reason text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ac.id,
    ac.code,
    ac.user_id,
    u.email::text AS user_email,
    al.created_at AS blocked_at,
    admin.email::text AS blocked_by,
    COALESCE(al.details->>'reason', 'Admin moderation') AS reason
  FROM affiliate_codes ac
  JOIN auth.users u ON u.id = ac.user_id
  LEFT JOIN LATERAL (
    SELECT *
    FROM admin_logs l
    WHERE l.action = 'block_affiliate_code' AND l.target_type = 'user' AND l.target_id = ac.user_id
    ORDER BY l.created_at DESC
    LIMIT 1
  ) al ON TRUE
  LEFT JOIN auth.users admin ON admin.id = al.admin_user_id
  WHERE ac.is_active = false
  ORDER BY al.created_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_blocked_affiliate_codes() TO anon, authenticated, service_role;


