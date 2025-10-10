-- Create transfer_form_uploads table for managing student uploads of filled transfer forms
CREATE TABLE IF NOT EXISTS transfer_form_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES scholarship_applications(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'under_review' CHECK (status IN ('under_review', 'approved', 'rejected')),
    review_notes TEXT,
    rejection_reason TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Ensure only one active upload per application (latest one)
    CONSTRAINT unique_active_upload_per_application UNIQUE (application_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_transfer_form_uploads_application 
ON transfer_form_uploads(application_id);

CREATE INDEX IF NOT EXISTS idx_transfer_form_uploads_status 
ON transfer_form_uploads(status);

CREATE INDEX IF NOT EXISTS idx_transfer_form_uploads_uploaded_by 
ON transfer_form_uploads(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_transfer_form_uploads_uploaded_at 
ON transfer_form_uploads(uploaded_at);

-- Enable Row Level Security
ALTER TABLE transfer_form_uploads ENABLE ROW LEVEL SECURITY;

-- Policy: Students can read their own uploads
CREATE POLICY "Students can read their own transfer form uploads"
ON transfer_form_uploads
FOR SELECT
USING (
    uploaded_by = auth.uid()
);

-- Policy: Students can insert uploads for their own applications
CREATE POLICY "Students can insert transfer form uploads for their applications"
ON transfer_form_uploads
FOR INSERT
WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
        SELECT 1 FROM scholarship_applications 
        WHERE id = application_id 
        AND student_id = (
            SELECT id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    )
);

-- Policy: Students can update their own uploads (for re-uploading)
CREATE POLICY "Students can update their own transfer form uploads"
ON transfer_form_uploads
FOR UPDATE
USING (uploaded_by = auth.uid())
WITH CHECK (uploaded_by = auth.uid());

-- Policy: Admins and universities can read all uploads
CREATE POLICY "Admins and universities can read all transfer form uploads"
ON transfer_form_uploads
FOR SELECT
USING (
    auth.uid() IS NOT NULL
);

-- Policy: Admins and universities can update uploads (for approval/rejection)
CREATE POLICY "Admins and universities can update transfer form uploads"
ON transfer_form_uploads
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Add comments
COMMENT ON TABLE transfer_form_uploads IS 'Stores student uploads of filled transfer forms with approval workflow';
COMMENT ON COLUMN transfer_form_uploads.application_id IS 'Reference to the scholarship application';
COMMENT ON COLUMN transfer_form_uploads.file_url IS 'Path to the uploaded file in storage';
COMMENT ON COLUMN transfer_form_uploads.uploaded_by IS 'User ID of the student who uploaded';
COMMENT ON COLUMN transfer_form_uploads.status IS 'Current status: under_review, approved, rejected';
COMMENT ON COLUMN transfer_form_uploads.review_notes IS 'Optional notes from the reviewer';
COMMENT ON COLUMN transfer_form_uploads.rejection_reason IS 'Reason for rejection if status is rejected';
COMMENT ON COLUMN transfer_form_uploads.uploaded_at IS 'When the file was uploaded';
COMMENT ON COLUMN transfer_form_uploads.reviewed_at IS 'When the upload was reviewed';
COMMENT ON COLUMN transfer_form_uploads.reviewed_by IS 'User ID of the reviewer';
