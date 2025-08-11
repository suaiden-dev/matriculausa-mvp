-- Add role column to user_profiles and move admin checks from auth metadata to profiles

BEGIN;

-- 1) Add role column
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS role text CHECK (role IN ('student','school','admin')) DEFAULT 'student';

-- 2) Backfill admin role from auth metadata or known admin emails
UPDATE public.user_profiles up
SET role = 'admin'
FROM auth.users au
WHERE up.user_id = au.id
  AND (
    (au.raw_user_meta_data ->> 'role') = 'admin'
    OR au.email IN ('admin@matriculausa.com', 'admin@example.com')
  );

-- 3) Replace is_admin() to check user_profiles.role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.user_id = auth.uid()
      AND up.role = 'admin'
  );
$$;

-- 4) Replace get_admin_users_data() to include role from user_profiles
CREATE OR REPLACE FUNCTION public.get_admin_users_data()
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
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
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
    COALESCE(up.role, 'student') as role
  FROM auth.users au
  LEFT JOIN public.user_profiles up ON au.id = up.user_id
  ORDER BY au.created_at DESC;
END;
$$;

-- 5) Policies: use is_admin() as gate for select/update on user_profiles
DROP POLICY IF EXISTS "Admins can view all user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all user profiles" ON public.user_profiles;

CREATE POLICY "Admins can view all user profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update all user profiles"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6) Grants (idempotent)
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_users_data() TO authenticated;

COMMIT;


