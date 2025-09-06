-- Fix seller_registrations RLS policies
-- The current policies are trying to access user_profiles table which may cause permission issues

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own registrations" ON seller_registrations;
DROP POLICY IF EXISTS "Affiliate admins can view all registrations" ON seller_registrations;
DROP POLICY IF EXISTS "Affiliate admins can update registrations" ON seller_registrations;
DROP POLICY IF EXISTS "Users can insert their own registrations" ON seller_registrations;

-- Create new policies that work properly
-- Allow users to view their own registrations
CREATE POLICY "Users can view their own registrations" ON seller_registrations
    FOR SELECT USING (user_id = auth.uid());

-- Allow affiliate admins to view all registrations (using auth.users directly)
CREATE POLICY "Affiliate admins can view all registrations" ON seller_registrations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'affiliate_admin'
        )
    );

-- Allow affiliate admins to update registrations
CREATE POLICY "Affiliate admins can update registrations" ON seller_registrations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'affiliate_admin'
        )
    );

-- Allow users to insert their own registrations
CREATE POLICY "Users can insert their own registrations" ON seller_registrations
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Also allow service role to manage all registrations (for system operations)
CREATE POLICY "Service role can manage all registrations" ON seller_registrations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
