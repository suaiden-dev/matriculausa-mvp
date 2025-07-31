-- Criar tabela chatwoot_accounts
CREATE TABLE IF NOT EXISTS chatwoot_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  chatwoot_user_name TEXT,
  chatwoot_email TEXT,
  chatwoot_password TEXT,
  chatwoot_access_token TEXT,
  chatwoot_instance_name TEXT,
  chatwoot_user_id TEXT,
  chatwoot_account_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_chatwoot_accounts_user_id ON chatwoot_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_chatwoot_accounts_email ON chatwoot_accounts(chatwoot_email);

-- Habilitar RLS
ALTER TABLE chatwoot_accounts ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas seus próprios dados
CREATE POLICY "Users can view own chatwoot accounts" ON chatwoot_accounts
  FOR SELECT USING (auth.uid() = user_id);

-- Política para usuários inserirem/atualizarem seus próprios dados
CREATE POLICY "Users can insert own chatwoot accounts" ON chatwoot_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chatwoot accounts" ON chatwoot_accounts
  FOR UPDATE USING (auth.uid() = user_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
CREATE TRIGGER update_chatwoot_accounts_updated_at 
  BEFORE UPDATE ON chatwoot_accounts 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column(); 