-- Migration: Add function to get email from auth.users
-- This function allows us to retrieve email from auth.users table safely

-- Create function to get user email from auth.users
CREATE OR REPLACE FUNCTION public.get_auth_user_email(target_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email text;
BEGIN
  -- Get email from auth.users table
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = target_user_id;
  
  RETURN user_email;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and return null
    RAISE LOG 'Error in get_auth_user_email for user %: %', target_user_id, SQLERRM;
    RETURN NULL;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_auth_user_email(uuid) TO authenticated;

-- Grant execute permission to service role (for admin operations)
GRANT EXECUTE ON FUNCTION public.get_auth_user_email(uuid) TO service_role;

-- Create function to sync missing emails from auth.users to user_profiles
CREATE OR REPLACE FUNCTION public.sync_missing_emails()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count integer := 0;
BEGIN
  -- Update user_profiles where email is null but exists in auth.users
  UPDATE public.user_profiles 
  SET email = auth_users.email,
      updated_at = NOW()
  FROM auth.users AS auth_users
  WHERE user_profiles.user_id = auth_users.id 
  AND (user_profiles.email IS NULL OR user_profiles.email = '')
  AND auth_users.email IS NOT NULL
  AND auth_users.email != '';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RAISE LOG 'sync_missing_emails updated % records', updated_count;
  
  RETURN updated_count;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in sync_missing_emails: %', SQLERRM;
    RETURN -1;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.sync_missing_emails() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_missing_emails() TO service_role;