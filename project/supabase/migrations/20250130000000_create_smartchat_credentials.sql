-- Criar tabela para credenciais do SmartChat (Chatwoot)
CREATE TABLE smartchat_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  smartchat_url TEXT DEFAULT 'https://app.chatwoot.com',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Garantir que cada usuário tenha apenas uma configuração
  UNIQUE(user_id)
);

-- Criar índice na user_id para performance
CREATE INDEX idx_smartchat_credentials_user_id ON smartchat_credentials(user_id);

-- Adicionar RLS (Row Level Security)
ALTER TABLE smartchat_credentials ENABLE ROW LEVEL SECURITY;

-- Política para que usuários só vejam/editem suas próprias credenciais
CREATE POLICY "Users can view their own smartchat credentials" ON smartchat_credentials
  FOR SELECT USING (
    user_id IN (
      SELECT id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own smartchat credentials" ON smartchat_credentials
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own smartchat credentials" ON smartchat_credentials
  FOR UPDATE USING (
    user_id IN (
      SELECT id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own smartchat credentials" ON smartchat_credentials
  FOR DELETE USING (
    user_id IN (
      SELECT id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_smartchat_credentials_updated_at 
  BEFORE UPDATE ON smartchat_credentials 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();