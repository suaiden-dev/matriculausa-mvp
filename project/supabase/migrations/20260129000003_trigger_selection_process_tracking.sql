/*
  # Trigger para Rastrear Pagamento Selection Process Fee
  
  Esta migration cria um trigger que automaticamente:
  1. Atualiza o status do referral para 'selection_process_paid'
  2. NÃO credita coins (isso só acontece no I20)
  3. Funciona para QUALQUER método de pagamento
*/

-- Função que será executada pelo trigger
CREATE OR REPLACE FUNCTION handle_selection_process_payment_tracking()
RETURNS TRIGGER AS $$
DECLARE
  v_used_code RECORD;
BEGIN
  -- Só executar se has_paid_selection_process_fee mudou de false para true
  IF (OLD.has_paid_selection_process_fee = false OR OLD.has_paid_selection_process_fee IS NULL) 
     AND NEW.has_paid_selection_process_fee = true THEN
    
    RAISE NOTICE '[Selection Process Trigger] Payment detected for user: %', NEW.user_id;
    
    -- Buscar se o usuário usou algum código de referência
    SELECT referrer_id, affiliate_code 
    INTO v_used_code
    FROM used_referral_codes 
    WHERE user_id = NEW.user_id 
    LIMIT 1;
    
    IF FOUND AND v_used_code.referrer_id IS NOT NULL THEN
      RAISE NOTICE '[Selection Process Trigger] Referrer found: %', v_used_code.referrer_id;
      
      -- Atualizar status do referral para 'selection_process_paid' (SEM creditar coins)
      BEGIN
        PERFORM update_referral_status(
          NEW.user_id,
          'selection_process_paid',
          NOW()
        );
        RAISE NOTICE '[Selection Process Trigger] Referral status updated to selection_process_paid';
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '[Selection Process Trigger] Failed to update referral status: %', SQLERRM;
      END;
      
    ELSE
      RAISE NOTICE '[Selection Process Trigger] No referral code found for user: %', NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar o trigger
DROP TRIGGER IF EXISTS trigger_selection_process_tracking ON user_profiles;
CREATE TRIGGER trigger_selection_process_tracking
  AFTER UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_selection_process_payment_tracking();

-- Comentário
COMMENT ON FUNCTION handle_selection_process_payment_tracking() IS 
'Trigger function que atualiza o status do referral quando selection process fee é pago. NÃO credita coins (isso só acontece no I20).';

COMMENT ON TRIGGER trigger_selection_process_tracking ON user_profiles IS
'Trigger que rastreia quando Selection Process Fee é marcado como pago';
