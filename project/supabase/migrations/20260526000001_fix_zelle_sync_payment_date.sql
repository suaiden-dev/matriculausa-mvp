-- Migration: Fix Zelle payment date sync to preserve exact time
-- Target: sync_user_profile_payment_flags

CREATE OR REPLACE FUNCTION public.sync_user_profile_payment_flags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  fee_type_param text;
  amount_param numeric;
  fee_type_individual text;
BEGIN
  -- Só processar quando status muda para 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- selection_process (aceita ambas as variantes: com e sem _fee)
    IF NEW.fee_type IN ('selection_process', 'selection_process_fee') 
       OR NEW.fee_type_global IN ('selection_process', 'selection_process_fee') THEN
      fee_type_param := 'selection_process';
      fee_type_individual := 'selection_process';
      amount_param := COALESCE(NEW.amount, 0);
      
      UPDATE user_profiles 
      SET has_paid_selection_process_fee = true
      WHERE user_id = NEW.user_id;
      
    ELSIF NEW.fee_type IN ('i20_control', 'i20_control_fee', 'i-20_control_fee') 
       OR NEW.fee_type_global IN ('i20_control', 'i20_control_fee') THEN
      fee_type_param := 'i20_control_fee';
      fee_type_individual := 'i20_control';
      amount_param := COALESCE(NEW.amount, 0);
      
      UPDATE user_profiles 
      SET has_paid_i20_control_fee = true
      WHERE user_id = NEW.user_id;
      
    ELSIF NEW.fee_type IN ('scholarship_fee', 'scholarship') 
       OR NEW.fee_type_global IN ('scholarship_fee', 'scholarship') THEN
      fee_type_param := 'scholarship_fee';
      fee_type_individual := 'scholarship';
      amount_param := COALESCE(NEW.amount, 0);
      
      UPDATE user_profiles 
      SET is_scholarship_fee_paid = true
      WHERE user_id = NEW.user_id;
      
    ELSIF NEW.fee_type IN ('application_fee', 'application') 
       OR NEW.fee_type_global IN ('application_fee', 'application') THEN
      fee_type_param := 'application';
      fee_type_individual := 'application';
      amount_param := COALESCE(NEW.amount, 0);
      
      UPDATE user_profiles 
      SET is_application_fee_paid = true
      WHERE user_id = NEW.user_id;

    ELSIF NEW.fee_type = 'ds160_package' THEN
      fee_type_param := 'ds160_package';
      fee_type_individual := 'ds160_package';
      amount_param := COALESCE(NEW.amount, 0);
      UPDATE user_profiles SET has_paid_ds160_package = true WHERE user_id = NEW.user_id;

    ELSIF NEW.fee_type = 'i539_cos_package' THEN
      fee_type_param := 'i539_cos_package';
      fee_type_individual := 'i539_cos_package';
      amount_param := COALESCE(NEW.amount, 0);
      UPDATE user_profiles SET has_paid_i539_cos_package = true WHERE user_id = NEW.user_id;

    ELSIF NEW.fee_type = 'placement_fee' THEN
      fee_type_param := 'placement_fee';
      fee_type_individual := 'placement';
      amount_param := COALESCE(NEW.amount, 0);
      UPDATE user_profiles SET is_placement_fee_paid = true WHERE user_id = NEW.user_id;

    ELSIF NEW.fee_type IN ('reinstatement_fee', 'reinstatement_package') 
       OR NEW.fee_type_global = 'reinstatement_fee' THEN
      fee_type_param := 'reinstatement_fee';
      fee_type_individual := 'reinstatement_fee';
      amount_param := COALESCE(NEW.amount, 0);
      UPDATE user_profiles SET has_paid_reinstatement_package = true WHERE user_id = NEW.user_id;

    END IF;
    
    -- Registrar faturamento automaticamente
    IF fee_type_param IS NOT NULL AND fee_type_param != 'application' THEN
      PERFORM register_payment_billing(
        NEW.user_id,
        fee_type_param,
        amount_param,
        NEW.id::text,
        'zelle'
      );
    END IF;

    -- Inserir registro contábil na individual_fee_payments usando o timestamp real
    IF fee_type_individual IS NOT NULL THEN
      INSERT INTO individual_fee_payments (
        user_id,
        fee_type,
        amount,
        payment_date,
        payment_method,
        zelle_payment_id,
        gross_amount_usd
      )
      SELECT
        NEW.user_id,
        fee_type_individual,
        amount_param,
        COALESCE(NEW.admin_approved_at, NEW.created_at), -- Use real timestamps instead of date-only cast
        'zelle',
        NEW.id,
        amount_param
      WHERE NOT EXISTS (
        SELECT 1 FROM individual_fee_payments WHERE zelle_payment_id = NEW.id
      );
    END IF;

  END IF;
  
  RETURN NEW;
END;
$function$;
