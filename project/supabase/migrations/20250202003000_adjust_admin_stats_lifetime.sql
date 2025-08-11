-- Adjust admin stats to not filter by user creation date, so totals reflect lifetime values

-- get_matricula_rewards_admin_stats: lifetime users/coins; referrals still filtered by range
CREATE OR REPLACE FUNCTION get_matricula_rewards_admin_stats(date_range text DEFAULT '30d')
RETURNS TABLE (
  total_users bigint,
  total_referrals bigint,
  total_coins_earned numeric,
  total_coins_spent numeric,
  conversion_rate numeric,
  average_coins_per_user numeric
) AS $$
DECLARE
  start_date timestamptz;
BEGIN
  CASE date_range
    WHEN '7d' THEN start_date := now() - interval '7 days';
    WHEN '30d' THEN start_date := now() - interval '30 days';
    WHEN '90d' THEN start_date := now() - interval '90 days';
    WHEN '1y' THEN start_date := now() - interval '1 year';
    ELSE start_date := now() - interval '30 days';
  END CASE;

  RETURN QUERY
  SELECT 
    -- lifetime users
    COUNT(DISTINCT u.id)::bigint as total_users,
    -- referrals in range
    COUNT(DISTINCT ar.id)::bigint as total_referrals,
    -- lifetime coins (from credits table)
    COALESCE(SUM(mc.total_earned), 0) as total_coins_earned,
    COALESCE(SUM(mc.total_spent), 0) as total_coins_spent,
    CASE 
      WHEN COUNT(DISTINCT u.id) > 0 THEN 
        ROUND((COUNT(DISTINCT ar.id)::numeric / COUNT(DISTINCT u.id)::numeric) * 100, 2)
      ELSE 0 
    END as conversion_rate,
    CASE 
      WHEN COUNT(DISTINCT u.id) > 0 THEN 
        ROUND(COALESCE(SUM(mc.total_earned), 0) / COUNT(DISTINCT u.id)::numeric, 2)
      ELSE 0 
    END as average_coins_per_user
  FROM auth.users u
  LEFT JOIN affiliate_codes ac ON u.id = ac.user_id
  LEFT JOIN affiliate_referrals ar ON ac.user_id = ar.referrer_id 
    AND ar.created_at >= start_date
  LEFT JOIN matriculacoin_credits mc ON u.id = mc.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- export_matricula_rewards_data: include all users; keep referral count filtered by range
CREATE OR REPLACE FUNCTION export_matricula_rewards_data(date_range text DEFAULT '30d')
RETURNS TABLE (
  user_email text,
  full_name text,
  affiliate_code text,
  total_referrals bigint,
  total_earnings numeric,
  total_spent numeric,
  current_balance numeric,
  last_activity timestamptz
) AS $$
DECLARE
  start_date timestamptz;
BEGIN
  CASE date_range
    WHEN '7d' THEN start_date := now() - interval '7 days';
    WHEN '30d' THEN start_date := now() - interval '30 days';
    WHEN '90d' THEN start_date := now() - interval '90 days';
    WHEN '1y' THEN start_date := now() - interval '1 year';
    ELSE start_date := now() - interval '30 days';
  END CASE;

  RETURN QUERY
  SELECT 
    u.email::text as user_email,
    COALESCE(up.full_name, u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) as full_name,
    ac.code as affiliate_code,
    COUNT(ar.id)::bigint as total_referrals,
    COALESCE(mc.total_earned, 0) as total_earnings,
    COALESCE(mc.total_spent, 0) as total_spent,
    COALESCE(mc.balance, 0) as current_balance,
    COALESCE(up.last_active, u.last_sign_in_at, u.created_at) as last_activity
  FROM auth.users u
  LEFT JOIN user_profiles up ON u.id = up.user_id
  LEFT JOIN affiliate_codes ac ON u.id = ac.user_id
  LEFT JOIN affiliate_referrals ar ON ac.user_id = ar.referrer_id 
    AND ar.created_at >= start_date
  LEFT JOIN matriculacoin_credits mc ON u.id = mc.user_id
  GROUP BY u.id, u.email, up.full_name, u.raw_user_meta_data, ac.code, mc.total_earned, mc.total_spent, mc.balance, up.last_active, u.last_sign_in_at, u.created_at
  ORDER BY total_referrals DESC, total_earnings DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


