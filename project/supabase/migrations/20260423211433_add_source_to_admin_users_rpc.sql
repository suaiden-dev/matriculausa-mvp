-- Update function to safely get admin user data including source
DROP FUNCTION IF EXISTS get_admin_users_data();
CREATE OR REPLACE FUNCTION get_admin_users_data()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  raw_user_meta_data jsonb,
  full_name text,
  phone text,
  country text,
  field_of_interest text,
  academic_level text,
  status text,
  last_active timestamptz,
  source text -- Added source field
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    au.id,
    au.email::text,
    au.created_at,
    au.last_sign_in_at,
    au.raw_user_meta_data,
    COALESCE(up.full_name, au.raw_user_meta_data ->> 'name', split_part(au.email, '@', 1)) as full_name,
    up.phone,
    up.country,
    up.field_of_interest,
    up.academic_level,
    COALESCE(up.status, 'active') as status,
    COALESCE(up.last_active, au.created_at) as last_active,
    up.source -- Return source from user_profiles
  FROM auth.users au
  LEFT JOIN user_profiles up ON au.id = up.user_id
  ORDER BY au.created_at DESC;
END;
$$;
