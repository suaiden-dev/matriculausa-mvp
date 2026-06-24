-- Migration: Add translation to zelle_payments check constraints
-- Date: 2026-06-11

ALTER TABLE zelle_payments DROP CONSTRAINT IF EXISTS zelle_payments_fee_type_check;
ALTER TABLE zelle_payments ADD CONSTRAINT zelle_payments_fee_type_check CHECK (fee_type = ANY (ARRAY['selection_process'::text, 'selection_process_fee'::text, 'application_fee'::text, 'enrollment_fee'::text, 'scholarship_fee'::text, 'i20_control'::text, 'i-20_control_fee'::text, 'placement_fee'::text, 'ds160_package'::text, 'i539_cos_package'::text, 'reinstatement_package'::text, 'application_fee_migma'::text, 'translation'::text]));

ALTER TABLE zelle_payments DROP CONSTRAINT IF EXISTS zelle_payments_fee_type_global_check;
ALTER TABLE zelle_payments ADD CONSTRAINT zelle_payments_fee_type_global_check CHECK (fee_type_global = ANY (ARRAY['selection_process'::text, 'i20_control_fee'::text, 'application_fee'::text, 'scholarship_fee'::text, 'reinstatement_fee'::text, 'translation'::text]));
