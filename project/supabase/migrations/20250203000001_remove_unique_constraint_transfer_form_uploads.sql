-- Remove the unique constraint that prevents multiple uploads per application
-- This allows students to re-upload after rejection
ALTER TABLE transfer_form_uploads DROP CONSTRAINT IF EXISTS unique_active_upload_per_application;

-- Add a comment explaining the change
COMMENT ON TABLE transfer_form_uploads IS 'Stores student uploads of filled transfer forms with approval workflow. Multiple uploads allowed for re-submission after rejection.';
