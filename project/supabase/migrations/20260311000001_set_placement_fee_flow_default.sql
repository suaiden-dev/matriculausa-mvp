-- Migration: set_placement_fee_flow_default_true
-- Data: 2026-03-11
-- Descrição: Altera o valor padrão da coluna placement_fee_flow para TRUE, para que todos os novos cadastros entrem automaticamente no novo fluxo.

ALTER TABLE user_profiles 
ALTER COLUMN placement_fee_flow SET DEFAULT TRUE;
