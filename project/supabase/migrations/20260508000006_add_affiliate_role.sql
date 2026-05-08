-- Migration: Add 'affiliate' role to user_profiles
-- Purpose: Allow non-student users to register as affiliates in the MatriculaRewards program.

ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_role_check
    CHECK (role IN ('student', 'school', 'admin', 'seller', 'affiliate_admin', 'affiliate'));
