-- Migration: create_zelle_activity_log_trigger
-- Descrição: Cria um trigger na tabela zelle_payments para registrar automaticamente
-- no activity log do aluno (student_action_logs) dois eventos:
-- 1. Quando o aluno envia um comprovante (INSERT) → "proof submitted — pending verification"
-- 2. Quando o status muda para 'rejected' (UPDATE) → "Zelle payment rejected"
-- A aprovação (status = 'approved') é intencionalmente ignorada aqui pois
-- já é registrada pelo HTTP Request do n8n via função log_zelle_approval.

CREATE OR REPLACE FUNCTION public.log_zelle_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id uuid;
  v_fee_label  text;
  v_fee_type   text;
BEGIN
  -- Ignora registros sem user_id ou sem valor (evita logs de registros fantasmas)
  IF NEW.user_id IS NULL OR COALESCE(NEW.amount, 0) = 0 THEN
    RETURN NEW;
  END IF;

  -- Resolve o fee_type priorizando fee_type sobre fee_type_global
  v_fee_type := COALESCE(NEW.fee_type, NEW.fee_type_global, 'payment');

  -- Mapeia o fee_type técnico para nome legível
  v_fee_label := CASE v_fee_type
    WHEN 'selection_process'     THEN 'Selection Process Fee'
    WHEN 'i20_control'           THEN 'I-20 Control Fee'
    WHEN 'i20_control_fee'       THEN 'I-20 Control Fee'
    WHEN 'scholarship_fee'       THEN 'Scholarship Fee'
    WHEN 'application_fee'       THEN 'Application Fee'
    WHEN 'placement_fee'         THEN 'Placement Fee'
    WHEN 'ds160_package'         THEN 'DS-160 Package'
    WHEN 'i539_cos_package'      THEN 'I-539 COS Package'
    WHEN 'reinstatement_package' THEN 'Reinstatement Package'
    ELSE v_fee_type
  END;

  -- Busca o ID do perfil do aluno (user_profiles.id) a partir do auth user_id
  SELECT id INTO v_student_id
  FROM public.user_profiles
  WHERE user_id = NEW.user_id
  LIMIT 1;

  -- Se o perfil não for encontrado, não bloqueia a operação principal
  IF v_student_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Evento 1: INSERT — aluno enviou o comprovante
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_student_action(
      p_student_id         := v_student_id,
      p_action_type        := 'fee_payment',
      p_action_description := v_fee_label || ' Zelle proof submitted — pending verification',
      p_performed_by       := NEW.user_id,
      p_performed_by_type  := 'student',
      p_metadata           := jsonb_build_object(
        'fee_type',       v_fee_type,
        'payment_method', 'zelle',
        'amount',         NEW.amount,
        'payment_id',     NEW.id::text,
        'event',          'proof_submitted'
      )
    );
  END IF;

  -- Evento 2: UPDATE — status mudou PARA 'rejected' (ignora se já era rejected)
  IF TG_OP = 'UPDATE'
     AND NEW.status = 'rejected'
     AND (OLD.status IS DISTINCT FROM 'rejected') THEN
    PERFORM public.log_student_action(
      p_student_id         := v_student_id,
      p_action_type        := 'fee_payment',
      p_action_description := v_fee_label || ' Zelle payment rejected',
      p_performed_by       := NEW.user_id,
      p_performed_by_type  := 'student',
      p_metadata           := jsonb_build_object(
        'fee_type',       v_fee_type,
        'payment_method', 'zelle',
        'amount',         NEW.amount,
        'payment_id',     NEW.id::text,
        'event',          'payment_rejected',
        'admin_notes',    NEW.admin_notes
      )
    );
  END IF;

  -- Evento 'approved' é ignorado intencionalmente:
  -- o log de aprovação é gerado pelo HTTP Request do n8n via log_zelle_approval()

  RETURN NEW;
END;
$$;

-- Cria o trigger que dispara APÓS INSERT ou UPDATE do campo status
-- UPDATE OF status garante que só dispara quando a coluna status muda,
-- evitando logs desnecessários em outros UPDATEs na linha
DROP TRIGGER IF EXISTS trg_log_zelle_activity ON public.zelle_payments;

CREATE TRIGGER trg_log_zelle_activity
  AFTER INSERT OR UPDATE OF status ON public.zelle_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.log_zelle_activity();
