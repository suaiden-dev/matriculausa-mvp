-- Migration: Grant post_sales access to Storage Buckets
-- Purpose: Allow post_sales role to view sensitive files (legal documents, student documents, zelle proofs, etc).

-- Note: We use the existing is_post_sales() function which is a SECURITY DEFINER 
-- to avoid recursion and ensure consistency.

CREATE POLICY "post_sales_view_sensitive_documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = ANY (ARRAY['legal-documents', 'student-documents', 'document-attachments', 'zelle_comprovantes', 'identity-photos', 'zelle-payments'])
    AND is_post_sales()
  );

-- Also allow viewing message attachments
CREATE POLICY "post_sales_view_message_attachments"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'message-attachments'
    AND is_post_sales()
  );
