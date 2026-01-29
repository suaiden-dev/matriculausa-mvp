/*
  # Matricula Rewards - Tracking de Status de Indicações
  
  Adiciona campos para rastrear o progresso dos alunos indicados através do funil de pagamentos.
  Isso permite que o padrinho acompanhe em que etapa o aluno indicado está.
  
  ## Mudanças
  
  1. Adicionar campos de tracking na tabela affiliate_referrals:
     - referred_student_status: Status atual do aluno indicado
     - selection_process_paid_at: Quando pagou Selection Process Fee
     - scholarship_fee_paid_at: Quando pagou Scholarship Fee
     - i20_paid_at: Quando pagou I20 Control Fee
     - last_status_update: Última atualização de status
  
  2. Criar função RPC para buscar status das indicações
  
  ## Status possíveis
  - 'registered': Aluno se registrou com código de referência
  - 'selection_process_paid': Pagou Selection Process Fee
  - 'scholarship_fee_paid': Pagou Scholarship Fee
  - 'i20_paid': Pagou I20 Control Fee (coins creditados)
  - 'completed': Processo completo
*/

-- Adicionar campos de tracking na tabela affiliate_referrals
ALTER TABLE affiliate_referrals 
  ADD COLUMN IF NOT EXISTS referred_student_status text DEFAULT 'registered',
  ADD COLUMN IF NOT EXISTS selection_process_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS scholarship_fee_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS i20_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_status_update timestamptz DEFAULT now();

-- Adicionar constraint para validar status
ALTER TABLE affiliate_referrals 
  DROP CONSTRAINT IF EXISTS affiliate_referrals_status_check;

ALTER TABLE affiliate_referrals 
  ADD CONSTRAINT affiliate_referrals_referred_student_status_check 
  CHECK (referred_student_status IN (
    'registered', 
    'selection_process_paid', 
    'scholarship_fee_paid', 
    'i20_paid', 
    'completed'
  ));

-- Criar índice para melhor performance nas consultas de status
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_status 
  ON affiliate_referrals(referred_student_status);

CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_referrer_status 
  ON affiliate_referrals(referrer_id, referred_student_status);

-- Criar função RPC para buscar status das indicações do usuário
CREATE OR REPLACE FUNCTION get_my_referrals_status(referrer_user_id uuid)
RETURNS TABLE (
  referred_user_id uuid,
  referred_user_name text,
  referred_user_email text,
  referral_code text,
  current_status text,
  selection_process_paid_at timestamptz,
  scholarship_fee_paid_at timestamptz,
  i20_paid_at timestamptz,
  credits_earned numeric,
  created_at timestamptz,
  last_status_update timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ar.referred_id as referred_user_id,
    up.full_name as referred_user_name,
    up.email as referred_user_email,
    ar.affiliate_code as referral_code,
    ar.referred_student_status as current_status,
    ar.selection_process_paid_at,
    ar.scholarship_fee_paid_at,
    ar.i20_paid_at,
    ar.credits_earned,
    ar.created_at,
    ar.last_status_update
  FROM affiliate_referrals ar
  JOIN user_profiles up ON ar.referred_id = up.user_id
  WHERE ar.referrer_id = referrer_user_id
  ORDER BY ar.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário da função
COMMENT ON FUNCTION get_my_referrals_status(uuid) IS 
'Retorna o status de todas as indicações feitas por um usuário, incluindo informações sobre o progresso de cada aluno indicado';

-- Atualizar registros existentes para ter o status correto baseado nos dados atuais
-- Se já tem credits_earned > 0, significa que já completou (no sistema antigo era selection_process)
UPDATE affiliate_referrals 
SET 
  referred_student_status = CASE 
    WHEN credits_earned > 0 THEN 'selection_process_paid'
    ELSE 'registered'
  END,
  last_status_update = now()
WHERE referred_student_status IS NULL OR referred_student_status = 'registered';

-- Criar função auxiliar para atualizar status de indicação
CREATE OR REPLACE FUNCTION update_referral_status(
  p_referred_user_id uuid,
  p_new_status text,
  p_timestamp timestamptz DEFAULT now()
)
RETURNS void AS $$
DECLARE
  v_column_name text;
BEGIN
  -- Determinar qual coluna de timestamp atualizar baseado no status
  v_column_name := CASE p_new_status
    WHEN 'selection_process_paid' THEN 'selection_process_paid_at'
    WHEN 'scholarship_fee_paid' THEN 'scholarship_fee_paid_at'
    WHEN 'i20_paid' THEN 'i20_paid_at'
    ELSE NULL
  END;
  
  -- Atualizar status e timestamp correspondente
  UPDATE affiliate_referrals
  SET 
    referred_student_status = p_new_status,
    last_status_update = p_timestamp,
    selection_process_paid_at = CASE WHEN p_new_status = 'selection_process_paid' THEN p_timestamp ELSE selection_process_paid_at END,
    scholarship_fee_paid_at = CASE WHEN p_new_status = 'scholarship_fee_paid' THEN p_timestamp ELSE scholarship_fee_paid_at END,
    i20_paid_at = CASE WHEN p_new_status = 'i20_paid' THEN p_timestamp ELSE i20_paid_at END
  WHERE referred_id = p_referred_user_id;
  
  RAISE NOTICE 'Status atualizado para usuário %: %', p_referred_user_id, p_new_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário da função
COMMENT ON FUNCTION update_referral_status(uuid, text, timestamptz) IS 
'Atualiza o status de uma indicação e o timestamp correspondente. Usado pelas edge functions de pagamento.';
