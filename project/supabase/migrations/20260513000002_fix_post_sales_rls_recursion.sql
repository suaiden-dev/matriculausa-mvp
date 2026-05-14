-- FIX: Infinite recursion in post_sales RLS policies
--
-- Problem: Policies with inline `EXISTS (SELECT 1 FROM user_profiles ...)`
-- cause infinite recursion because the policy queries the same table it protects.
--
-- Fix: Use a SECURITY DEFINER function — it runs with definer privileges
-- and bypasses RLS, breaking the recursion cycle.

-- 1. Create is_post_sales() with SECURITY DEFINER
CREATE OR REPLACE FUNCTION is_post_sales()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'post_sales'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Also fix is_admin_or_post_sales() to be consistent
CREATE OR REPLACE FUNCTION is_admin_or_post_sales()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'post_sales')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Drop all bad policies (with inline EXISTS)
DROP POLICY IF EXISTS "post_sales_select_user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "post_sales_select_scholarship_applications" ON scholarship_applications;
DROP POLICY IF EXISTS "post_sales_update_scholarship_applications" ON scholarship_applications;
DROP POLICY IF EXISTS "post_sales_select_scholarships" ON scholarships;
DROP POLICY IF EXISTS "post_sales_select_universities" ON universities;
DROP POLICY IF EXISTS "post_sales_all_document_requests" ON document_requests;
DROP POLICY IF EXISTS "post_sales_all_document_request_uploads" ON document_request_uploads;
DROP POLICY IF EXISTS "post_sales_select_student_documents" ON student_documents;
DROP POLICY IF EXISTS "post_sales_select_zelle_payments" ON zelle_payments;
DROP POLICY IF EXISTS "post_sales_update_zelle_payments" ON zelle_payments;

-- 3. Recreate policies using is_post_sales() (SECURITY DEFINER — no recursion)
CREATE POLICY "post_sales_select_user_profiles"
  ON public.user_profiles FOR SELECT TO authenticated
  USING (is_post_sales());

CREATE POLICY "post_sales_select_scholarship_applications"
  ON public.scholarship_applications FOR SELECT TO authenticated
  USING (is_post_sales());

CREATE POLICY "post_sales_update_scholarship_applications"
  ON public.scholarship_applications FOR UPDATE TO authenticated
  USING (is_post_sales());

CREATE POLICY "post_sales_select_scholarships"
  ON public.scholarships FOR SELECT TO authenticated
  USING (is_post_sales());

CREATE POLICY "post_sales_select_universities"
  ON public.universities FOR SELECT TO authenticated
  USING (is_post_sales());

CREATE POLICY "post_sales_all_document_requests"
  ON public.document_requests FOR ALL TO authenticated
  USING (is_post_sales())
  WITH CHECK (is_post_sales());

CREATE POLICY "post_sales_all_document_request_uploads"
  ON public.document_request_uploads FOR ALL TO authenticated
  USING (is_post_sales())
  WITH CHECK (is_post_sales());

CREATE POLICY "post_sales_select_student_documents"
  ON public.student_documents FOR SELECT TO authenticated
  USING (is_post_sales());

CREATE POLICY "post_sales_select_zelle_payments"
  ON public.zelle_payments FOR SELECT TO authenticated
  USING (is_post_sales());

CREATE POLICY "post_sales_update_zelle_payments"
  ON public.zelle_payments FOR UPDATE TO authenticated
  USING (is_post_sales());
