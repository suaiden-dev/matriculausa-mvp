/*
  # Add admin policy to read user_cart for statistics
  
  This migration adds a policy that allows admins to read all user_cart entries
  for the purpose of counting scholarship views/interests in the admin dashboard.
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admins can view all user carts" ON public.user_cart;

-- Create policy for admins to read all cart entries using is_admin() function
CREATE POLICY "Admins can view all user carts"
  ON public.user_cart
  FOR SELECT
  TO authenticated
  USING (is_admin());

