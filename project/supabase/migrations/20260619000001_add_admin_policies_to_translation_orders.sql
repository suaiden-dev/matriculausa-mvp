-- Migration: Add RLS policies for admin and post_sales roles on translation_orders table

-- Enable admins to perform all actions
CREATE POLICY "Admins can perform all actions on translation orders" ON public.translation_orders
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Enable post_sales to view and update translation orders
CREATE POLICY "Post sales can view all translation orders" ON public.translation_orders
  FOR SELECT TO authenticated USING (is_post_sales());

CREATE POLICY "Post sales can update all translation orders" ON public.translation_orders
  FOR UPDATE TO authenticated USING (is_post_sales()) WITH CHECK (is_post_sales());
