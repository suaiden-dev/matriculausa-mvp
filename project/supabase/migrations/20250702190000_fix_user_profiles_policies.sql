-- Habilita RLS na tabela user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Remove policies antigas se existirem
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow trigger to insert user profiles" ON user_profiles;

-- Permite que o próprio usuário leia seu perfil
CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Permite que o próprio usuário atualize seu perfil
CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Permite que o próprio usuário insira seu perfil (caso o trigger não crie)
CREATE POLICY "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Permite que o trigger de criação automática insira perfis
CREATE POLICY "Allow trigger to insert user profiles"
  ON user_profiles
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Garante que a tabela está exposta na API REST
-- (No Supabase, isso é feito via painel, mas documentamos aqui para referência)
-- Para produção, confira no painel se user_profiles está marcada como "Exposed". 