/*
  # Fix schema permissions for authenticated users

  1. Schema Access
    - Grant USAGE permission on public schema to authenticated role
    - This is required for RLS policies to work properly

  2. Table Permissions
    - Grant SELECT, INSERT, UPDATE, DELETE on all tables to authenticated
    - RLS policies will then control actual access

  3. Function Permissions
    - Grant EXECUTE on all functions to authenticated
    - Ensure admin functions can be called

  4. Default Privileges
    - Set default privileges for future tables and functions
*/

-- Grant usage on public schema to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant permissions on all existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant permissions on all existing sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute on all existing functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

-- Set default privileges for future sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- Set default privileges for future functions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated;

-- Specifically grant permissions on our main tables
GRANT ALL ON universities TO authenticated;
GRANT ALL ON scholarships TO authenticated;
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON admin_logs TO authenticated;
GRANT ALL ON scholarship_applications TO authenticated;

-- Grant execute on our admin functions
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_users_data() TO authenticated;
GRANT EXECUTE ON FUNCTION approve_university(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_university(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION log_admin_action(text, text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION promote_user_to_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated;