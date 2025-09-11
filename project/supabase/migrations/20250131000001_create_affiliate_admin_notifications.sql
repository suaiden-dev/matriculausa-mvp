-- Create affiliate admin notifications table
CREATE TABLE IF NOT EXISTS affiliate_admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  notification_type text DEFAULT 'general' CHECK (notification_type IN ('general', 'i20_deadline_expired', 'payment_received', 'student_status_change')),
  metadata jsonb -- Para dados adicionais como student_id, seller_id, etc.
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_admin_notifications_admin_id ON affiliate_admin_notifications(affiliate_admin_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_admin_notifications_read_at ON affiliate_admin_notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_affiliate_admin_notifications_created_at ON affiliate_admin_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_affiliate_admin_notifications_type ON affiliate_admin_notifications(notification_type);

-- Enable RLS
ALTER TABLE affiliate_admin_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Affiliate admins can view their own notifications"
  ON affiliate_admin_notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = affiliate_admin_id);

CREATE POLICY "Affiliate admins can update their own notifications"
  ON affiliate_admin_notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = affiliate_admin_id)
  WITH CHECK (auth.uid() = affiliate_admin_id);

CREATE POLICY "System can insert notifications for affiliate admins"
  ON affiliate_admin_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Affiliate admins can delete their own notifications"
  ON affiliate_admin_notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = affiliate_admin_id);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_affiliate_admin_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_affiliate_admin_notifications_updated_at
  BEFORE UPDATE ON affiliate_admin_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_affiliate_admin_notifications_updated_at();
