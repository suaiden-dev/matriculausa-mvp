-- Migration: add_placement_fee_flow_to_user_profiles
-- Data: 2026-03-04
-- Descrição: Adiciona coluna placement_fee_flow para identificar usuários no novo fluxo de taxas.
--            TRUE = novo fluxo (Placement Fee ao invés de scholarship_fee + i20_control_fee).

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS placement_fee_flow BOOLEAN DEFAULT FALSE;

-- Marcar usuários registrados a partir de 2026-03-04 como pertencentes ao novo fluxo
UPDATE user_profiles
SET placement_fee_flow = TRUE
WHERE created_at >= '2026-03-04'::date;

COMMENT ON COLUMN user_profiles.placement_fee_flow IS 
'Identifica usuários no novo fluxo de taxas (Placement Fee). TRUE = novo fluxo (sem scholarship_fee e i20_control_fee separados). A data de corte padrão é 2026-03-04.';
