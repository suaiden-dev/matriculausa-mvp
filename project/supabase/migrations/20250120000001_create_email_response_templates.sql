-- Criar tabela para templates de resposta de email
CREATE TABLE IF NOT EXISTS email_response_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type VARCHAR(50) NOT NULL,
  response_template TEXT NOT NULL,
  ai_prompt TEXT,
  auto_reply_enabled BOOLEAN DEFAULT true,
  requires_human_review BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir templates padrão
INSERT INTO email_response_templates (email_type, response_template, ai_prompt, auto_reply_enabled, requires_human_review) VALUES
('application', 'Dear {{userName}},

Thank you for your application inquiry. We have received your request and our team is reviewing your application.

Please ensure you have uploaded all required documents in your student dashboard. If you need assistance with document uploads, please visit our help center.

We will contact you within 2-3 business days with updates on your application status.

Best regards,
Matrícula USA Team', 
'You are responding to a student application inquiry. Be helpful and guide them to upload documents if needed. Keep it professional and encouraging.', 
true, false),

('document_request', 'Dear {{userName}},

We have received your document request from {{universityName}}. Please log into your student dashboard and upload the requested documents as soon as possible.

To upload documents:
1. Go to your student dashboard
2. Navigate to "Documents" section
3. Click "Upload New Document"
4. Select the required document type
5. Upload your file

If you have any questions about document requirements, please contact our support team.

Best regards,
Matrícula USA Team',
'You are responding to a document request from a university. Guide the student to upload documents and provide clear instructions.', 
true, false),

('payment', 'Dear {{userName}},

Thank you for your payment inquiry. We have received your payment and it is being processed.

If you are experiencing payment issues, please:
1. Check your payment method
2. Ensure sufficient funds are available
3. Contact our support team if problems persist

For payment-related questions, please visit our payment FAQ or contact support.

Best regards,
Matrícula USA Team',
'You are responding to a payment-related email. Be helpful and provide clear guidance for payment issues.', 
true, false),

('scholarship', 'Dear {{userName}},

Thank you for your scholarship inquiry. We are reviewing your scholarship application and will provide updates soon.

Please ensure all required documents are uploaded and your application is complete. Scholarship decisions are typically made within 1-2 weeks.

If you have specific questions about your scholarship application, please contact our scholarship team.

Best regards,
Matrícula USA Team',
'You are responding to a scholarship inquiry. Be encouraging and provide clear timeline expectations.', 
true, false),

('admission', 'Dear {{userName}},

Thank you for your admission inquiry. We are processing your admission request and will provide updates within 3-5 business days.

Please ensure all required documents are uploaded and your application is complete. If you need assistance with the admission process, please contact our admission team.

Best regards,
Matrícula USA Team',
'You are responding to an admission inquiry. Be professional and provide clear timeline expectations.', 
true, false),

('general', 'Dear {{userName}},

Thank you for contacting Matrícula USA. We have received your message and will respond to your inquiry within 24-48 hours.

If this is an urgent matter, please contact our support team directly.

Best regards,
Matrícula USA Team',
'You are responding to a general inquiry. Be professional and helpful.', 
true, true);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_email_response_templates_type ON email_response_templates(email_type);
CREATE INDEX IF NOT EXISTS idx_email_response_templates_enabled ON email_response_templates(auto_reply_enabled); 