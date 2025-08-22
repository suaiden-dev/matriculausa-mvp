/*
  # Create Sellers Table
  
  This table stores information about sellers who work under affiliate admins.
  Sellers can refer students and earn commissions.
  
  1. Table Structure
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to auth.users)
    - `email` (text, unique)
    - `name` (text)
    - `phone` (text, optional)
    - `territory` (text, optional)
    - `referral_code` (text, unique)
    - `is_active` (boolean, default true)
    - `affiliate_admin_id` (uuid, foreign key to affiliate_admins)
    - `commission_rate` (numeric, default 0.10 for 10%)
    - `created_at` (timestamp)
    - `updated_at` (timestamp)
    
  2. Security
    - Enable RLS on the table
    - Add policies for sellers to view their own data
    - Add policies for affiliate admins to view their sellers
*/

-- Create sellers table
CREATE TABLE IF NOT EXISTS sellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  phone text,
  territory text,
  referral_code text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  affiliate_admin_id uuid REFERENCES affiliate_admins(id) ON DELETE SET NULL,
  commission_rate numeric(5,4) DEFAULT 0.1000 CHECK (commission_rate >= 0 AND commission_rate <= 1),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;

-- Create policies for sellers
CREATE POLICY "Sellers can view their own data"
  ON sellers
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Sellers can update their own data"
  ON sellers
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Sellers can insert their own data"
  ON sellers
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create policies for affiliate admins
CREATE POLICY "Affiliate admins can view their sellers"
  ON sellers
  FOR SELECT
  TO authenticated
  USING (
    affiliate_admin_id IN (
      SELECT id FROM affiliate_admins WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Affiliate admins can manage their sellers"
  ON sellers
  FOR ALL
  TO authenticated
  USING (
    affiliate_admin_id IN (
      SELECT id FROM affiliate_admins WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    affiliate_admin_id IN (
      SELECT id FROM affiliate_admins WHERE user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_sellers_user_id ON sellers(user_id);
CREATE INDEX idx_sellers_email ON sellers(email);
CREATE INDEX idx_sellers_referral_code ON sellers(referral_code);
CREATE INDEX idx_sellers_affiliate_admin_id ON sellers(affiliate_admin_id);
CREATE INDEX idx_sellers_is_active ON sellers(is_active);

-- Create updated_at trigger
CREATE TRIGGER update_sellers_updated_at 
  BEFORE UPDATE ON sellers 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE sellers IS 'Stores information about sellers who work under affiliate admins';
COMMENT ON COLUMN sellers.commission_rate IS 'Commission rate as decimal (0.1000 = 10%)';
