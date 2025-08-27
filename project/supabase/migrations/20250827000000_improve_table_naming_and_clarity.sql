/*
  # Melhorias na Nomenclatura e Clareza das Tabelas - Sistema de Referência
  
  Esta migração melhora a clareza das tabelas e colunas relacionadas ao sistema de referência,
  adicionando comentários explicativos e padronizando a nomenclatura.
  
  Objetivos:
  1. Adicionar comentários explicativos nas tabelas
  2. Padronizar nomenclatura das colunas
  3. Melhorar a documentação do sistema
*/

-- ============================================================================
-- TABELA: affiliate_codes (Códigos de Indicação - Matricula Rewards)
-- ============================================================================
-- Esta tabela armazena os códigos únicos de indicação para o sistema Matricula Rewards
-- Cada usuário pode ter um código único para indicar outros estudantes
COMMENT ON TABLE affiliate_codes IS 'Códigos únicos de indicação para o sistema Matricula Rewards - cada usuário pode ter um código para indicar outros estudantes';

COMMENT ON COLUMN affiliate_codes.user_id IS 'ID do usuário que possui este código de indicação';
COMMENT ON COLUMN affiliate_codes.code IS 'Código único de indicação (ex: MATR5969)';
COMMENT ON COLUMN affiliate_codes.is_active IS 'Se o código está ativo e pode ser usado';
COMMENT ON COLUMN affiliate_codes.total_referrals IS 'Total de indicações realizadas com este código';
COMMENT ON COLUMN affiliate_codes.total_earnings IS 'Total de créditos ganhos com este código';

-- ============================================================================
-- TABELA: used_referral_codes (Códigos de Referência Utilizados)
-- ============================================================================
-- Esta tabela rastreia quando um código de referência foi usado por um usuário
-- É usada para evitar uso duplo e aplicar descontos automaticamente
COMMENT ON TABLE used_referral_codes IS 'Rastreia quando um código de referência foi usado por um usuário - usado para evitar uso duplo e aplicar descontos';

COMMENT ON COLUMN used_referral_codes.user_id IS 'ID do usuário que usou o código de referência';
COMMENT ON COLUMN used_referral_codes.affiliate_code IS 'Código de referência que foi usado';
COMMENT ON COLUMN used_referral_codes.referrer_id IS 'ID do usuário que criou o código de referência';
COMMENT ON COLUMN used_referral_codes.discount_amount IS 'Valor do desconto aplicado (em USD)';
COMMENT ON COLUMN used_referral_codes.stripe_coupon_id IS 'ID do cupom criado no Stripe para este desconto';
COMMENT ON COLUMN used_referral_codes.status IS 'Status do desconto: pending, applied, expired, cancelled';
COMMENT ON COLUMN used_referral_codes.applied_at IS 'Quando o desconto foi aplicado';
COMMENT ON COLUMN used_referral_codes.expires_at IS 'Quando o desconto expira (30 dias após aplicação)';

-- ============================================================================
-- TABELA: affiliate_referrals (Indicações Realizadas)
-- ============================================================================
-- Esta tabela registra todas as indicações realizadas no sistema
-- É usada para calcular comissões e estatísticas dos afiliados
COMMENT ON TABLE affiliate_referrals IS 'Registra todas as indicações realizadas no sistema - usado para calcular comissões e estatísticas dos afiliados';

COMMENT ON COLUMN affiliate_referrals.referrer_id IS 'ID do usuário que fez a indicação (quem tem o código)';
COMMENT ON COLUMN affiliate_referrals.referred_id IS 'ID do usuário que foi indicado (quem usou o código)';
COMMENT ON COLUMN affiliate_referrals.affiliate_code IS 'Código de referência usado na indicação';
COMMENT ON COLUMN affiliate_referrals.payment_amount IS 'Valor do pagamento realizado pelo usuário indicado';
COMMENT ON COLUMN affiliate_referrals.credits_earned IS 'Créditos ganhos pelo referenciador por esta indicação';
COMMENT ON COLUMN affiliate_referrals.status IS 'Status da indicação: pending, completed, cancelled';
COMMENT ON COLUMN affiliate_referrals.payment_session_id IS 'ID da sessão de pagamento do Stripe';

-- ============================================================================
-- TABELA: matriculacoin_credits (Saldo de Créditos Matricula Coins)
-- ============================================================================
-- Esta tabela mantém o saldo de créditos de cada usuário
-- Os créditos são ganhos por indicações e podem ser gastos em descontos
COMMENT ON TABLE matriculacoin_credits IS 'Mantém o saldo de créditos Matricula Coins de cada usuário - créditos são ganhos por indicações e podem ser gastos em descontos';

COMMENT ON COLUMN matriculacoin_credits.user_id IS 'ID do usuário proprietário dos créditos';
COMMENT ON COLUMN matriculacoin_credits.balance IS 'Saldo atual de créditos disponíveis';
COMMENT ON COLUMN matriculacoin_credits.total_earned IS 'Total de créditos ganhos desde o início';
COMMENT ON COLUMN matriculacoin_credits.total_spent IS 'Total de créditos gastos desde o início';

-- ============================================================================
-- TABELA: matriculacoin_transactions (Histórico de Transações de Créditos)
-- ============================================================================
-- Esta tabela registra todas as transações de créditos (ganhos e gastos)
-- É usada para auditoria e histórico completo de movimentações
COMMENT ON TABLE matriculacoin_transactions IS 'Registra todas as transações de créditos (ganhos e gastos) - usado para auditoria e histórico completo de movimentações';

COMMENT ON COLUMN matriculacoin_transactions.user_id IS 'ID do usuário envolvido na transação';
COMMENT ON COLUMN matriculacoin_transactions.type IS 'Tipo da transação: earned (ganho), spent (gasto), expired (expirado), refunded (reembolsado)';
COMMENT ON COLUMN matriculacoin_transactions.amount IS 'Quantidade de créditos na transação';
COMMENT ON COLUMN matriculacoin_transactions.description IS 'Descrição da transação (ex: "Créditos ganhos por indicação")';
COMMENT ON COLUMN matriculacoin_transactions.reference_id IS 'ID de referência para rastrear a origem da transação';
COMMENT ON COLUMN matriculacoin_transactions.reference_type IS 'Tipo de referência (ex: referral, tuition_redemption, test_coins_addition)';
COMMENT ON COLUMN matriculacoin_transactions.balance_after IS 'Saldo após a transação';

-- ============================================================================
-- TABELA: user_profiles (Perfis de Usuários)
-- ============================================================================
-- Esta tabela armazena informações adicionais dos usuários
-- Inclui campos para códigos de referência usados
COMMENT ON TABLE user_profiles IS 'Armazena informações adicionais dos usuários - inclui campos para códigos de referência usados';

COMMENT ON COLUMN user_profiles.referral_code_used IS 'Código de referência Matricula Rewards usado pelo usuário (se aplicável)';
COMMENT ON COLUMN user_profiles.seller_referral_code IS 'Código de referência de seller usado pelo usuário (se aplicável)';
COMMENT ON COLUMN user_profiles.referred_by_seller_id IS 'ID do seller que fez a indicação (se aplicável)';
COMMENT ON COLUMN user_profiles.referred_at IS 'Data/hora em que o usuário foi indicado';

-- ============================================================================
-- FUNÇÃO: validate_and_apply_referral_code
-- ============================================================================
-- Esta função valida e aplica um código de referência para um usuário
-- Cria registros nas tabelas necessárias e aplica desconto automático
COMMENT ON FUNCTION validate_and_apply_referral_code(uuid, text) IS 'Valida e aplica um código de referência para um usuário - cria registros nas tabelas necessárias e aplica desconto automático';

-- ============================================================================
-- FUNÇÃO: process_affiliate_referral
-- ============================================================================
-- Esta função processa uma indicação completa, criando registros e adicionando créditos
-- É chamada automaticamente após validação do código de referência
COMMENT ON FUNCTION process_affiliate_referral(text, uuid, numeric, text) IS 'Processa uma indicação completa, criando registros e adicionando créditos - chamada automaticamente após validação do código de referência';

-- ============================================================================
-- FUNÇÃO: get_user_active_discount
-- ============================================================================
-- Esta função retorna o desconto ativo de um usuário
-- Usada para verificar se o usuário tem desconto válido
COMMENT ON FUNCTION get_user_active_discount(uuid) IS 'Retorna o desconto ativo de um usuário - usada para verificar se o usuário tem desconto válido';

-- ============================================================================
-- RESUMO DO SISTEMA DE REFERÊNCIA
-- ============================================================================
/*
  FLUXO COMPLETO DO SISTEMA DE REFERÊNCIA:
  
  1. Usuário A cria um código de referência (MATR5969) → affiliate_codes
  2. Usuário B se registra usando o código → useReferralCodeCapture salva no localStorage
  3. Durante o registro → useAuth processa automaticamente o código
  4. Validação do código → validate_and_apply_referral_code
  5. Aplicação do desconto → used_referral_codes (status: applied)
  6. Processamento da indicação → process_affiliate_referral
  7. Criação do registro → affiliate_referrals (status: completed)
  8. Adição de créditos → matriculacoin_credits (balance +50)
  9. Registro da transação → matriculacoin_transactions (type: earned)
  
  TABELAS PRINCIPAIS:
  - affiliate_codes: Códigos únicos de indicação
  - used_referral_codes: Descontos aplicados aos usuários
  - affiliate_referrals: Indicações realizadas
  - matriculacoin_credits: Saldo de créditos dos usuários
  - matriculacoin_transactions: Histórico de transações
  
  NOMENCLATURA PADRONIZADA:
  - pending_affiliate_code: Código de Matricula Rewards no localStorage
  - pending_seller_referral_code: Código de seller no localStorage
  - referral_code_used: Código usado no perfil do usuário
  - seller_referral_code: Código de seller usado no perfil do usuário
*/
