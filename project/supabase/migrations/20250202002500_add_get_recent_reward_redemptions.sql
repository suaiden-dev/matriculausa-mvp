-- RPC to list recent reward redemptions with user and reward details

CREATE OR REPLACE FUNCTION get_recent_reward_redemptions(limit_count integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  user_email text,
  full_name text,
  reward_id uuid,
  reward_name text,
  cost_paid numeric,
  status text,
  redeemed_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rr.id,
    rr.user_id,
    u.email::text AS user_email,
    COALESCE(up.full_name, u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) AS full_name,
    rr.reward_id,
    r.name AS reward_name,
    rr.cost_paid,
    rr.status,
    rr.redeemed_at
  FROM reward_redemptions rr
  JOIN auth.users u ON u.id = rr.user_id
  LEFT JOIN user_profiles up ON up.user_id = u.id
  LEFT JOIN rewards r ON r.id = rr.reward_id
  ORDER BY rr.redeemed_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_recent_reward_redemptions(integer) TO anon, authenticated, service_role;


