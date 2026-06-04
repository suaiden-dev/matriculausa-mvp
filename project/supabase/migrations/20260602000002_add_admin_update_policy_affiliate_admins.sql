-- Migration: Allow administrators to update affiliate admins (for commission rules and status toggling)
CREATE POLICY "Admins can update all affiliate admins"
ON public.affiliate_admins
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());
