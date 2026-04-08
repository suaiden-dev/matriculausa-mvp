-- Criar tabela para rastrear emails processados do Microsoft Graph
-- Esta tabela evita respostas duplicadas ao manter histórico de todos os emails já processados

CREATE TABLE IF NOT EXISTS processed_microsoft_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  microsoft_message_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_email TEXT NOT NULL,
  subject TEXT,
  from_email TEXT,
  status TEXT NOT NULL CHECK (status IN ('processed', 'replied', 'error', 'skipped')),
  analysis JSONB,
  response_text TEXT,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_processed_microsoft_emails_message_id 
  ON processed_microsoft_emails(microsoft_message_id);

CREATE INDEX IF NOT EXISTS idx_processed_microsoft_emails_user_id 
  ON processed_microsoft_emails(user_id);

CREATE INDEX IF NOT EXISTS idx_processed_microsoft_emails_connection_email 
  ON processed_microsoft_emails(connection_email);

CREATE INDEX IF NOT EXISTS idx_processed_microsoft_emails_processed_at 
  ON processed_microsoft_emails(processed_at);

-- Índice composto para verificação rápida de duplicação
CREATE UNIQUE INDEX IF NOT EXISTS idx_processed_microsoft_emails_unique 
  ON processed_microsoft_emails(microsoft_message_id, user_id, connection_email);

-- RLS (Row Level Security)
ALTER TABLE processed_microsoft_emails ENABLE ROW LEVEL SECURITY;

-- Política para usuários poderem ver apenas seus próprios emails processados
CREATE POLICY "Users can view their own processed emails" ON processed_microsoft_emails
  FOR SELECT USING (auth.uid() = user_id);

-- Política para service role poder inserir/atualizar (usado pela Edge Function)
CREATE POLICY "Service role can manage processed emails" ON processed_microsoft_emails
  FOR ALL USING (true);

-- Comentários para documentação
COMMENT ON TABLE processed_microsoft_emails IS 'Tabela para rastrear emails processados do Microsoft Graph e evitar respostas duplicadas';
COMMENT ON COLUMN processed_microsoft_emails.microsoft_message_id IS 'ID único do email no Microsoft Graph';
COMMENT ON COLUMN processed_microsoft_emails.user_id IS 'ID do usuário proprietário do email';
COMMENT ON COLUMN processed_microsoft_emails.connection_email IS 'Endereço de email da conexão Microsoft';
COMMENT ON COLUMN processed_microsoft_emails.status IS 'Status do processamento: processed, replied, error, skipped';
COMMENT ON COLUMN processed_microsoft_emails.analysis IS 'Análise da IA em formato JSON';
COMMENT ON COLUMN processed_microsoft_emails.response_text IS 'Texto da resposta enviada (se houver)';
