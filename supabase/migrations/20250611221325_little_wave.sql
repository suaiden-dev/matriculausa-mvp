/*
  # Fix schema permissions for authenticated users

  1. Schema Access
    - Grant USAGE permission on public schema to authenticated role
    - Grant SELECT permission on all tables to authenticated role
    - Grant EXECUTE permission on functions to authenticated role

  2. Security
    - These are base permissions required for RLS to function
    - RLS policies will still control actual data access
    - Without these permissions, users can't even attempt queries
*/

-- Grant usage on public schema to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant select permissions on all existing tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant insert, update, delete permissions on specific tables where needed
GRANT INSERT, UPDATE, DELETE ON universities TO authenticated;
GRANT INSERT, UPDATE, DELETE ON scholarships TO authenticated;
GRANT INSERT, UPDATE, DELETE ON scholarship_applications TO authenticated;
GRANT INSERT, UPDATE, DELETE ON user_profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON admin_logs TO authenticated;

-- Grant execute permissions on all functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant usage and select on all sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- Ensure anon role has basic read access for public data
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON universities TO anon;
GRANT SELECT ON scholarships TO anon;

-- Set default privileges for anon role
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;