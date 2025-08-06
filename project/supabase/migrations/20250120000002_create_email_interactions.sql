-- Criar tabela para registrar interações de email
CREATE TABLE IF NOT EXISTS email_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  original_email_id VARCHAR(255),
  sender_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  original_content TEXT,
  response_content TEXT,
  response_type VARCHAR(50) DEFAULT 'ai', -- 'ai', 'template', 'human'
  template_id UUID REFERENCES email_response_templates(id),
  is_urgent BOOLEAN DEFAULT false,
  email_type VARCHAR(50) DEFAULT 'general',
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'processed', -- 'processed', 'pending_review', 'failed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_email_interactions_user_id ON email_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_email_interactions_email_type ON email_interactions(email_type);
CREATE INDEX IF NOT EXISTS idx_email_interactions_status ON email_interactions(status);
CREATE INDEX IF NOT EXISTS idx_email_interactions_processed_at ON email_interactions(processed_at);
CREATE INDEX IF NOT EXISTS idx_email_interactions_sender_email ON email_interactions(sender_email);

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_email_interactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_email_interactions_updated_at
  BEFORE UPDATE ON email_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_email_interactions_updated_at(); 