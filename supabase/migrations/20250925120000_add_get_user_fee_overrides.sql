-- Create SECURITY DEFINER function to fetch fee overrides for any user
-- This allows admin/affiliate dashboards to read student overrides despite RLS

CREATE OR REPLACE FUNCTION public.get_user_fee_overrides(user_id_param uuid)
RETURNS public.user_fee_overrides
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.user_fee_overrides
  WHERE user_id = user_id_param;
$$;

REVOKE ALL ON FUNCTION public.get_user_fee_overrides(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_fee_overrides(uuid) TO authenticated;



