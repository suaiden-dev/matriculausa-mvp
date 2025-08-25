-- Migration: Create Seller Registration System
-- This creates the necessary tables for seller registration and approval workflow

-- Create seller_registration_codes table
CREATE TABLE IF NOT EXISTS seller_registration_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    affiliate_admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    max_uses INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create seller_registrations table for pending approvals
CREATE TABLE IF NOT EXISTS seller_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    affiliate_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    registration_code TEXT NOT NULL,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE seller_registration_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_registrations ENABLE ROW LEVEL SECURITY;

-- Create policies for seller_registration_codes
CREATE POLICY "Public can view active codes" ON seller_registration_codes
    FOR SELECT USING (is_active = true);

CREATE POLICY "Affiliate admins can manage their codes" ON seller_registration_codes
    FOR ALL USING (
        affiliate_admin_id = auth.uid() OR 
        (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'affiliate_admin'
    );

-- Create policies for seller_registrations
CREATE POLICY "Users can view their own registrations" ON seller_registrations
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Affiliate admins can view all registrations" ON seller_registrations
    FOR SELECT USING (
        (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'affiliate_admin'
    );

CREATE POLICY "Affiliate admins can update registrations" ON seller_registrations
    FOR UPDATE USING (
        (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'affiliate_admin'
    );

CREATE POLICY "Users can insert their own registrations" ON seller_registrations
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_seller_registration_codes_code ON seller_registration_codes(code);
CREATE INDEX IF NOT EXISTS idx_seller_registration_codes_affiliate_admin_id ON seller_registration_codes(affiliate_admin_id);
CREATE INDEX IF NOT EXISTS idx_seller_registration_codes_is_active ON seller_registration_codes(is_active);

CREATE INDEX IF NOT EXISTS idx_seller_registrations_user_id ON seller_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_registrations_affiliate_admin_id ON seller_registrations(affiliate_admin_id);
CREATE INDEX IF NOT EXISTS idx_seller_registrations_status ON seller_registrations(status);
CREATE INDEX IF NOT EXISTS idx_seller_registrations_registration_code ON seller_registrations(registration_code);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_seller_registration_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_seller_registrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_seller_registration_codes_updated_at
    BEFORE UPDATE ON seller_registration_codes
    FOR EACH ROW EXECUTE FUNCTION update_seller_registration_codes_updated_at();

CREATE TRIGGER update_seller_registrations_updated_at
    BEFORE UPDATE ON seller_registrations
    FOR EACH ROW EXECUTE FUNCTION update_seller_registrations_updated_at();

-- Insert some sample registration codes for testing
INSERT INTO seller_registration_codes (code, affiliate_admin_id, is_active, max_uses, expires_at)
VALUES 
    ('NT_001', NULL, true, 10, now() + interval '1 year'),
    ('NT_002', NULL, true, 10, now() + interval '1 year'),
    ('NT_003', NULL, true, 10, now() + interval '1 year')
ON CONFLICT (code) DO NOTHING;

-- Add comments
COMMENT ON TABLE seller_registration_codes IS 'Codes that allow users to register as sellers';
COMMENT ON TABLE seller_registrations IS 'Pending seller registrations awaiting approval';
COMMENT ON COLUMN seller_registration_codes.code IS 'Unique registration code for sellers';
COMMENT ON COLUMN seller_registration_codes.affiliate_admin_id IS 'Admin who created this code (NULL for system codes)';
COMMENT ON COLUMN seller_registration_codes.max_uses IS 'Maximum number of times this code can be used';
COMMENT ON COLUMN seller_registration_codes.current_uses IS 'Current number of times this code has been used';
COMMENT ON COLUMN seller_registrations.status IS 'Registration status: pending, approved, rejected';
COMMENT ON COLUMN seller_registrations.rejection_reason IS 'Reason for rejection if status is rejected';
