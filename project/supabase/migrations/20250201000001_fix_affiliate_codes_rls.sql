/*
  # Correção das Políticas RLS para affiliate_codes
  
  Problema: A política atual só permite que usuários vejam seus próprios códigos,
  mas para validação de códigos de referência, precisamos que qualquer usuário
  autenticado possa ler todos os códigos ativos.
  
  Solução: Adicionar política para permitir leitura de códigos ativos para validação
*/

-- Remover política restritiva existente
DROP POLICY IF EXISTS "Users can view their own affiliate code" ON affiliate_codes;

-- Criar nova política que permite leitura de códigos ativos para validação
CREATE POLICY "Users can view active affiliate codes for validation"
  ON affiliate_codes
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Manter políticas existentes para INSERT e UPDATE
-- (já existem e estão corretas)
