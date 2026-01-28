-- Migration: Add identity photo verification status fields
-- This allows admins to approve or reject identity photos submitted by students

-- Create enum for identity photo status
CREATE TYPE identity_photo_status AS ENUM ('pending', 'approved', 'rejected');

-- Add new columns to comprehensive_term_acceptance table
ALTER TABLE comprehensive_term_acceptance
  ADD COLUMN IF NOT EXISTS identity_photo_status identity_photo_status DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS identity_photo_rejection_reason text,
  ADD COLUMN IF NOT EXISTS identity_photo_reviewed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS identity_photo_reviewed_by uuid REFERENCES auth.users(id);

-- Create index for filtering by status
CREATE INDEX IF NOT EXISTS idx_comprehensive_term_acceptance_photo_status 
  ON comprehensive_term_acceptance(identity_photo_status) 
  WHERE identity_photo_path IS NOT NULL;

-- Create index for reviewed_by to track admin reviews
CREATE INDEX IF NOT EXISTS idx_comprehensive_term_acceptance_photo_reviewed_by 
  ON comprehensive_term_acceptance(identity_photo_reviewed_by) 
  WHERE identity_photo_reviewed_by IS NOT NULL;

-- Update existing records: if photo exists but status is null, set to 'pending'
UPDATE comprehensive_term_acceptance
SET identity_photo_status = 'pending'
WHERE identity_photo_path IS NOT NULL 
  AND identity_photo_path != ''
  AND identity_photo_status IS NULL;

-- Add comment to columns
COMMENT ON COLUMN comprehensive_term_acceptance.identity_photo_status IS 'Status of identity photo verification: pending, approved, or rejected';
COMMENT ON COLUMN comprehensive_term_acceptance.identity_photo_rejection_reason IS 'Reason provided by admin when rejecting the identity photo';
COMMENT ON COLUMN comprehensive_term_acceptance.identity_photo_reviewed_at IS 'Timestamp when the photo was reviewed by admin';
COMMENT ON COLUMN comprehensive_term_acceptance.identity_photo_reviewed_by IS 'User ID of the admin who reviewed the photo';

