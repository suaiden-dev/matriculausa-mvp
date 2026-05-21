-- Migration: Add 'post_sales' role to user_profiles
-- Purpose: Allow a restricted admin type (Pós-Vendas) to access the admin dashboard
-- with limited permissions (Overview, Users, Scholarships, Universities, Zelle payments).

-- =====================================================
-- 1. Update CHECK constraint to include 'post_sales'
-- =====================================================
ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_role_check
    CHECK (role IN ('student', 'school', 'admin', 'seller', 'affiliate_admin', 'affiliate', 'post_sales'));

-- =====================================================
-- 2. Helper function to check if current user is admin or post_sales
-- =====================================================
CREATE OR REPLACE FUNCTION is_admin_or_post_sales()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'post_sales')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =====================================================
-- 3. Function to promote a user to post_sales
-- =====================================================
CREATE OR REPLACE FUNCTION promote_to_post_sales(target_email TEXT)
RETURNS void AS $$
BEGIN
  UPDATE user_profiles
  SET role = 'post_sales'
  WHERE email = target_email;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User with email % not found', target_email;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. RLS Policies for post_sales access
-- Each policy is ADDITIVE (OR'd with existing policies)
-- =====================================================

-- user_profiles: post_sales can view all profiles
CREATE POLICY "post_sales_select_user_profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'post_sales'
    )
  );

-- scholarship_applications: post_sales can view all applications
CREATE POLICY "post_sales_select_scholarship_applications"
  ON public.scholarship_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'post_sales'
    )
  );

-- scholarship_applications: post_sales can update (for document approve/reject)
CREATE POLICY "post_sales_update_scholarship_applications"
  ON public.scholarship_applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'post_sales'
    )
  );

-- scholarships: post_sales can view
CREATE POLICY "post_sales_select_scholarships"
  ON public.scholarships
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'post_sales'
    )
  );

-- universities: post_sales can view
CREATE POLICY "post_sales_select_universities"
  ON public.universities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'post_sales'
    )
  );

-- document_requests: post_sales can create and view
CREATE POLICY "post_sales_all_document_requests"
  ON public.document_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'post_sales'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'post_sales'
    )
  );

-- document_request_uploads: post_sales can view and update (approve/reject)
CREATE POLICY "post_sales_all_document_request_uploads"
  ON public.document_request_uploads
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'post_sales'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'post_sales'
    )
  );

-- student_documents: post_sales can view
CREATE POLICY "post_sales_select_student_documents"
  ON public.student_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'post_sales'
    )
  );

-- zelle_payments: post_sales can view and update (approve/reject)
CREATE POLICY "post_sales_select_zelle_payments"
  ON public.zelle_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'post_sales'
    )
  );

CREATE POLICY "post_sales_update_zelle_payments"
  ON public.zelle_payments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'post_sales'
    )
  );

-- =====================================================
-- NOTES:
-- Tables NOT granted to post_sales (blocked by existing RLS):
--   - coupon_codes / coupons
--   - newsletter_* tables
--   - affiliate_commissions / affiliate_admins
--   - matricula_rewards_*
-- =====================================================
