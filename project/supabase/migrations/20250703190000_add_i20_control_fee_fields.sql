-- Adiciona campos para controle do pagamento do I-20 Control Fee
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS has_paid_i20_control_fee boolean DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS i20_control_fee_due_date timestamptz;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS i20_control_fee_payment_intent_id text; 