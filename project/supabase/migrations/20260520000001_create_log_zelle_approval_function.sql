-- Migration: create_log_zelle_approval_function
-- Descrição: Cria uma função wrapper que o N8N pode chamar via HTTP Request
-- para registrar um log de atividade no activity log do aluno após aprovação
-- automática de pagamento Zelle. A função usa o user_id do próprio aluno como
-- executor do log, o que é semanticamente correto pois o aluno enviou o comprovante.
-- A descrição inclui o nome legível da taxa aprovada.

CREATE OR REPLACE FUNCTION public.log_zelle_approval(
  p_user_id    uuid,
  p_fee_type   text,
  p_amount     numeric,
  p_payment_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id uuid;
  v_fee_label  text;
BEGIN
  -- Mapeia o fee_type técnico para um nome legível na descrição do log
  v_fee_label := CASE p_fee_type
    WHEN 'selection_process'     THEN 'Selection Process Fee'
    WHEN 'i20_control'           THEN 'I-20 Control Fee'
    WHEN 'i20_control_fee'       THEN 'I-20 Control Fee'
    WHEN 'scholarship_fee'       THEN 'Scholarship Fee'
    WHEN 'application_fee'       THEN 'Application Fee'
    WHEN 'placement_fee'         THEN 'Placement Fee'
    WHEN 'ds160_package'         THEN 'DS-160 Package'
    WHEN 'i539_cos_package'      THEN 'I-539 COS Package'
    WHEN 'reinstatement_package' THEN 'Reinstatement Package'
    ELSE p_fee_type
  END;

  -- Busca o ID do perfil do aluno (user_profiles.id) a partir do auth user_id
  SELECT id INTO v_student_id
  FROM public.user_profiles
  WHERE user_id = p_user_id
  LIMIT 1;

  -- Só registra o log se o perfil do aluno for encontrado
  IF v_student_id IS NOT NULL THEN
    PERFORM public.log_student_action(
      p_student_id         := v_student_id,
      p_action_type        := 'fee_payment',
      p_action_description := v_fee_label || ' payment via Zelle approved automatically by system',
      p_performed_by       := p_user_id,  -- UUID do próprio aluno (já existe no banco)
      p_performed_by_type  := 'student',  -- Registrado como ação do aluno
      p_metadata           := jsonb_build_object(
        'fee_type',       p_fee_type,
        'payment_method', 'zelle',
        'amount',         p_amount,
        'payment_id',     p_payment_id,
        'approved_by',    'n8n_automatic'
      )
    );
  END IF;
END;
$$;

-- Concede permissão de execução para as roles usadas pelo Supabase e pelo N8N
GRANT EXECUTE ON FUNCTION public.log_zelle_approval TO authenticated, service_role;
