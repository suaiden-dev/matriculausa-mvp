/*
  # Permitir Acesso Anônimo para Validação de Códigos
  
  Problema: A validação de códigos acontece durante o registro,
  quando o usuário ainda não está autenticado.
  
  Solução: Criar política que permite acesso anônimo para validação
*/

-- Criar política para acesso anônimo à validação de códigos
CREATE POLICY "Anonymous users can validate affiliate codes"
  ON affiliate_codes
  FOR SELECT
  TO anon
  USING (is_active = true);
