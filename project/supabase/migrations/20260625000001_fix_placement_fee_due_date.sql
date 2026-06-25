-- Fix: placement_fee_due_date was never being written to user_profiles.
-- The trigger fires on INSERT into individual_fee_payments where fee_type = 'placement'
-- (covers Zelle manual and Stripe). Parcelow is covered via buildLegacyProfileMirror.
--
-- Also fixes double-processing: the trigger already handles fee_installment_plans updates,
-- so handleInstallmentPlanAssociation in zelleOrchestrator.ts is being removed separately.

CREATE OR REPLACE FUNCTION public.handle_placement_fee_payment_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_total_due NUMERIC;
    v_current_balance NUMERIC;
    v_installment_enabled BOOLEAN;
    v_active_plan_id UUID;
    v_new_installments_paid INT;
    v_new_amount_paid NUMERIC;
    v_remaining_after_payment NUMERIC;
BEGIN
  IF NEW.fee_type = 'placement' THEN

    -- Para pagamentos Parcelow, só processar quando o status for 'paid' (confirmado pelo webhook)
    IF NEW.parcelow_order_id IS NOT NULL AND NEW.payment_method = 'parcelow' THEN
      IF COALESCE(NEW.parcelow_status, 'pending') = 'pending' THEN
        RETURN NEW;
      END IF;
    END IF;

    -- Buscar dados atuais do perfil
    SELECT placement_fee_pending_balance, placement_fee_installment_enabled
    INTO v_current_balance, v_installment_enabled
    FROM public.user_profiles
    WHERE user_id = NEW.user_id;

    -- Se o saldo for NULL ou 0, inicializar
    IF v_current_balance IS NULL OR v_current_balance = 0 THEN
        IF v_installment_enabled THEN
            v_total_due := NEW.amount * 2;
        ELSE
            v_total_due := NEW.amount;
        END IF;

        UPDATE public.user_profiles
        SET placement_fee_pending_balance = v_total_due
        WHERE user_id = NEW.user_id;

        v_current_balance := v_total_due;
    END IF;

    -- Calcular saldo restante após este pagamento
    v_remaining_after_payment := GREATEST(0, COALESCE(v_current_balance, 0) - NEW.amount);

    -- Atualizar user_profiles: saldo, status e due_date
    UPDATE public.user_profiles
    SET
        placement_fee_pending_balance = v_remaining_after_payment,
        is_placement_fee_paid = CASE
            WHEN v_remaining_after_payment <= 0.01 THEN true
            ELSE is_placement_fee_paid
        END,
        placement_fee_paid_at = CASE
            WHEN v_remaining_after_payment <= 0.01 THEN NOW()
            ELSE placement_fee_paid_at
        END,
        placement_fee_installment_number = COALESCE(placement_fee_installment_number, 0) + 1,
        -- Set due date 30 days from now when there's still a balance; clear when fully paid
        placement_fee_due_date = CASE
            WHEN v_remaining_after_payment > 0.01 THEN NOW() + INTERVAL '30 days'
            ELSE NULL
        END,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;

    -- Atualizar fee_installment_plans se existir plano ativo
    SELECT id, installments_paid, amount_paid
    INTO v_active_plan_id, v_new_installments_paid, v_new_amount_paid
    FROM public.fee_installment_plans
    WHERE user_id = NEW.user_id
      AND fee_type = 'placement_fee'
      AND status = 'active'
    LIMIT 1;

    IF v_active_plan_id IS NOT NULL THEN
      v_new_installments_paid := COALESCE(v_new_installments_paid, 0) + 1;
      v_new_amount_paid := COALESCE(v_new_amount_paid, 0) + NEW.amount;

      UPDATE public.fee_installment_plans
      SET
        installments_paid = v_new_installments_paid,
        amount_paid = v_new_amount_paid,
        updated_at = NOW(),
        status = CASE
          WHEN v_new_installments_paid >= total_installments OR v_new_amount_paid >= total_amount
          THEN 'completed'
          ELSE status
        END,
        completed_at = CASE
          WHEN v_new_installments_paid >= total_installments OR v_new_amount_paid >= total_amount
          THEN NOW()
          ELSE completed_at
        END
      WHERE id = v_active_plan_id;

      -- Vincular installment_plan_id no registro que acabou de ser inserido
      UPDATE public.individual_fee_payments
      SET installment_plan_id = v_active_plan_id
      WHERE id = NEW.id
        AND installment_plan_id IS NULL;
    END IF;

  END IF;
  RETURN NEW;
END;
$function$;
