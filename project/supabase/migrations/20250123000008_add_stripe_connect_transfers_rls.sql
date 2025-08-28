-- Migration: Add RLS policies for stripe_connect_transfers table
-- This ensures sellers can view payment information for their referred students

-- Enable RLS on stripe_connect_transfers table
ALTER TABLE stripe_connect_transfers ENABLE ROW LEVEL SECURITY;

-- Policy for students to view their own transfers
CREATE POLICY "Students can view their own transfers"
  ON stripe_connect_transfers
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy for sellers to view transfers of their referred students
CREATE POLICY "Sellers can view transfers of their referred students"
  ON stripe_connect_transfers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN sellers s ON up.seller_referral_code = s.referral_code
      WHERE up.user_id = stripe_connect_transfers.user_id
      AND s.user_id = auth.uid()
      AND s.is_active = true
    )
  );

-- Policy for affiliate admins to view all transfers
CREATE POLICY "Affiliate admins can view all transfers"
  ON stripe_connect_transfers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliate_admins aa
      WHERE aa.user_id = auth.uid()
    )
  );

-- Policy for university owners to view transfers to their university
CREATE POLICY "University owners can view transfers to their university"
  ON stripe_connect_transfers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM universities u
      WHERE u.id = stripe_connect_transfers.university_id
      AND u.user_id = auth.uid()
    )
  );

-- Policy for admins to view all transfers
CREATE POLICY "Admins can view all transfers"
  ON stripe_connect_transfers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role = 'admin'
    )
  );

-- Grant permissions
GRANT SELECT ON stripe_connect_transfers TO authenticated;

-- Add comment
COMMENT ON TABLE stripe_connect_transfers IS 'Payment transfers with RLS policies for secure access control';
