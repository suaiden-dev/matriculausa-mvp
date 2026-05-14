-- Migration: Grant post_sales access to Activity Logs and Notifications
-- Purpose: Allow post_sales role to view student action logs, notifications, and chat attachments.

-- 1. student_action_logs: post_sales can view all logs
CREATE POLICY "post_sales_select_student_action_logs"
  ON public.student_action_logs
  FOR SELECT
  TO authenticated
  USING (is_post_sales());

-- 2. admin_notifications: post_sales can view all notifications
CREATE POLICY "post_sales_select_admin_notifications"
  ON public.admin_notifications
  FOR SELECT
  TO authenticated
  USING (is_post_sales());

-- 3. admin_student_chat_notifications: post_sales can view
CREATE POLICY "post_sales_select_admin_student_chat_notifications"
  ON public.admin_student_chat_notifications
  FOR SELECT
  TO authenticated
  USING (is_post_sales());

-- 4. admin_student_message_attachments: post_sales can view
CREATE POLICY "post_sales_select_admin_student_message_attachments"
  ON public.admin_student_message_attachments
  FOR SELECT
  TO authenticated
  USING (is_post_sales());

-- 5. legal_documents: post_sales can view
CREATE POLICY "post_sales_select_legal_documents"
  ON public.legal_documents
  FOR SELECT
  TO authenticated
  USING (is_post_sales());

-- 6. scholarship_packages: post_sales can view
CREATE POLICY "post_sales_select_scholarship_packages"
  ON public.scholarship_packages
  FOR SELECT
  TO authenticated
  USING (is_post_sales());

-- 7. promotional_coupons: post_sales can view
CREATE POLICY "post_sales_select_promotional_coupons"
  ON public.promotional_coupons
  FOR SELECT
  TO authenticated
  USING (is_post_sales());

-- 8. promotional_coupon_usage: post_sales can view
CREATE POLICY "post_sales_select_promotional_coupon_usage"
  ON public.promotional_coupon_usage
  FOR SELECT
  TO authenticated
  USING (is_post_sales());
