-- Correção das políticas RLS para resolver problemas de status 406
-- Drop and recreate policies to fix permission issues

-- Remove todas as políticas existentes da tabela user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow trigger to insert user profiles" ON user_profiles;

-- Recria as políticas com permissões mais amplas para resolver o erro 406
CREATE POLICY "Allow authenticated users to view user profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert user profiles"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow users to update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política especial para permitir que o sistema crie perfis automaticamente
CREATE POLICY "Allow service role to manage profiles"
  ON user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Garantir que RLS está habilitado
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Garantir que a tabela está exposta na API
COMMENT ON TABLE user_profiles IS 'User profile information for authenticated users';

-- Adiciona campos para controle do pagamento do I-20 Control Fee
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS has_paid_i20_control_fee boolean DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS i20_control_fee_due_date timestamptz;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS i20_control_fee_payment_intent_id text; 