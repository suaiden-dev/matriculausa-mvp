-- 1. Remover a restrição de NOT NULL do user_id (para aceitar alunos externos)
ALTER TABLE zelle_payments ALTER COLUMN user_id DROP NOT NULL;

-- 2. Atualizar a restrição (CHECK) de fee_type com a LISTA COMPLETA de tipos suportados
ALTER TABLE zelle_payments DROP CONSTRAINT IF EXISTS zelle_payments_fee_type_check;

ALTER TABLE zelle_payments ADD CONSTRAINT zelle_payments_fee_type_check 
CHECK (fee_type IN (
  'selection_process', 
  'selection_process_fee', 
  'application_fee', 
  'enrollment_fee', 
  'scholarship_fee', 
  'i20_control', 
  'i-20_control_fee', 
  'placement_fee', 
  'ds160_package', 
  'i539_cos_package', 
  'reinstatement_package',
  'application_fee_migma' -- Nova taxa para integração Migma
));

-- 3. Garantir que o status aceite todas as opções incluindo 'approved'
ALTER TABLE zelle_payments DROP CONSTRAINT IF EXISTS zelle_payments_status_check;

ALTER TABLE zelle_payments ADD CONSTRAINT zelle_payments_status_check 
CHECK (status IN ('pending', 'pending_verification', 'verified', 'approved', 'rejected', 'expired'));

-- 4. Comentário de auditoria
COMMENT ON COLUMN zelle_payments.user_id IS 'Pode ser nulo para pagamentos de sistemas externos (ex: Migma)';
