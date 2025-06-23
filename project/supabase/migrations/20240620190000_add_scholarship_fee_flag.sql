-- Adiciona o campo para controlar o pagamento da scholarship fee
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_scholarship_fee_paid boolean DEFAULT false; 