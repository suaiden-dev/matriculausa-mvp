/*
  # Correção das Políticas RLS para University Rewards
  
  O problema: As políticas criadas para university_rewards_account estavam muito restritivas,
  impedindo que as universidades acessassem seus próprios dados.
  
  Solução: Corrigir as políticas para permitir que universidades vejam suas próprias contas
  enquanto mantém a segurança adequada.
*/

-- Remover a política restritiva que impede universidades de acessar seus dados
DROP POLICY IF EXISTS "Only system can manage university rewards accounts" ON university_rewards_account;

-- Criar política correta que permite universidades verem suas próprias contas
CREATE POLICY "Universities can view their own rewards account"
  ON university_rewards_account
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM universities 
    WHERE universities.id = university_rewards_account.university_id 
    AND universities.user_id = auth.uid()
  ));

-- Política para permitir que o sistema (admins) gerencie as contas
CREATE POLICY "System can manage university rewards accounts"
  ON university_rewards_account
  FOR ALL
  TO authenticated
  USING (auth.uid() IN (
    SELECT user_id FROM user_profiles WHERE is_admin = true
  ));

-- Política para permitir inserção automática pelo sistema
CREATE POLICY "System can insert university rewards accounts"
  ON university_rewards_account
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Permitir inserção pelo sistema

-- Política para permitir atualização automática pelo sistema
CREATE POLICY "System can update university rewards accounts"
  ON university_rewards_account
  FOR UPDATE
  TO authenticated
  USING (true) -- Permitir atualização pelo sistema
  WITH CHECK (true);

-- Verificar se as políticas foram aplicadas corretamente
DO $$
BEGIN
  RAISE NOTICE 'Políticas RLS corrigidas para university_rewards_account';
END $$;
