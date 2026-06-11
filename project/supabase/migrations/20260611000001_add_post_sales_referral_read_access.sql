-- Migration: Add read-only access for post_sales role on affiliate/referral tables
-- Purpose: Allow post_sales (Pós-Vendas) users to see the ReferralInfoCard in student
--          details. Previously blocked by RLS — queries on affiliate_referrals, sellers,
--          affiliate_admins and used_referral_codes returned null, hiding the card entirely.

-- =====================================================
-- affiliate_referrals: post_sales can view (read-only)
-- =====================================================
CREATE POLICY "post_sales_select_affiliate_referrals"
  ON public.affiliate_referrals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'post_sales'
    )
  );

-- =====================================================
-- sellers: post_sales can view (read-only)
-- =====================================================
CREATE POLICY "post_sales_select_sellers"
  ON public.sellers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'post_sales'
    )
  );

-- =====================================================
-- affiliate_admins: post_sales can view (read-only)
-- Required for the JOIN in fetchReferralInfo that resolves agency name
-- =====================================================
CREATE POLICY "post_sales_select_affiliate_admins"
  ON public.affiliate_admins
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'post_sales'
    )
  );

-- =====================================================
-- used_referral_codes: post_sales can view (read-only)
-- Fallback lookup in fetchReferralInfo
-- =====================================================
CREATE POLICY "post_sales_select_used_referral_codes"
  ON public.used_referral_codes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'post_sales'
    )
  );
