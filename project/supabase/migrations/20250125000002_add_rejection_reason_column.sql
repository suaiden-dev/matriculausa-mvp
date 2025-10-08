-- Add rejection_reason column to document_request_uploads table
ALTER TABLE document_request_uploads 
ADD COLUMN rejection_reason TEXT;
