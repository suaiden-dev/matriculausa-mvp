-- Fix document_request_uploads table to add uploaded_by column
-- This resolves the error: column document_request_uploads.user_id does not exist

-- Add uploaded_by column to document_request_uploads table
ALTER TABLE public.document_request_uploads 
ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES auth.users(id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_document_request_uploads_uploaded_by 
ON public.document_request_uploads(uploaded_by);

-- Update existing records to set uploaded_by based on document_request context
-- This is a temporary fix - in production, this should be handled by the application
UPDATE public.document_request_uploads 
SET uploaded_by = (
  SELECT dr.scholarship_application_id::uuid 
  FROM public.document_requests dr 
  WHERE dr.id = document_request_uploads.document_request_id
)
WHERE uploaded_by IS NULL 
AND document_request_id IN (
  SELECT id FROM public.document_requests WHERE scholarship_application_id IS NOT NULL
);

-- Add comment to document the column
COMMENT ON COLUMN public.document_request_uploads.uploaded_by IS 'User ID who uploaded the document';
