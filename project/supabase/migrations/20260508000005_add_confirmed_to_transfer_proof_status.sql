-- Migration: Add 'confirmed' status to transfer_proof_to_school_status
-- Purpose: Allow student to confirm they sent the Transfer Form to their current school
--          before uploading the actual proof document.

ALTER TABLE scholarship_applications
  DROP CONSTRAINT IF EXISTS scholarship_applications_transfer_proof_to_school_status_check;

ALTER TABLE scholarship_applications
  ADD CONSTRAINT scholarship_applications_transfer_proof_to_school_status_check
    CHECK (transfer_proof_to_school_status IN ('pending', 'confirmed', 'submitted', 'viewed'));
