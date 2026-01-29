/*
  # Trigger para Creditar MatriculaCoins no Pagamento I20
  
  Esta migration cria um trigger que automaticamente:
  1. Credita 180 MatriculaCoins quando I20 é pago
  2. Atualiza o status do referral para 'i20_paid'
  3. Funciona para QUALQUER método de pagamento (Stripe, Zelle automático, Zelle manual)
  
  Isso centraliza a lógica no banco de dados ao invés de ter em múltiplas Edge Functions.
*/

-- Função que será executada pelo trigger
CREATE OR REPLACE FUNCTION handle_i20_payment_rewards()
RETURNS TRIGGER AS $$
DECLARE
  v_used_code RECORD;
  v_referred_name TEXT;
BEGIN
  -- Só executar se has_paid_i20_control_fee mudou de false para true
  IF (OLD.has_paid_i20_control_fee = false OR OLD.has_paid_i20_control_fee IS NULL) 
     AND NEW.has_paid_i20_control_fee = true THEN
    
    RAISE NOTICE '[I20 Rewards Trigger] I20 payment detected for user: %', NEW.user_id;
    
    -- Buscar se o usuário usou algum código de referência
    SELECT referrer_id, affiliate_code 
    INTO v_used_code
    FROM used_referral_codes 
    WHERE user_id = NEW.user_id 
    LIMIT 1;
    
    IF FOUND AND v_used_code.referrer_id IS NOT NULL THEN
      RAISE NOTICE '[I20 Rewards Trigger] Referrer found: %', v_used_code.referrer_id;
      
      -- Obter nome do usuário que pagou
      v_referred_name := COALESCE(NEW.full_name, NEW.email, NEW.user_id::text);
      
      -- Creditar 180 MatriculaCoins ao referrer
      BEGIN
        PERFORM add_coins_to_user_matricula(
          v_used_code.referrer_id,
          180,
          'Referral reward: I20 Control Fee paid by ' || v_referred_name
        );
        RAISE NOTICE '[I20 Rewards Trigger] 180 coins credited to referrer: %', v_used_code.referrer_id;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '[I20 Rewards Trigger] Failed to credit coins: %', SQLERRM;
      END;
      
      -- Atualizar status do referral para 'i20_paid'
      BEGIN
        PERFORM update_referral_status(
          NEW.user_id,
          'i20_paid',
          NOW()
        );
        RAISE NOTICE '[I20 Rewards Trigger] Referral status updated to i20_paid';
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '[I20 Rewards Trigger] Failed to update referral status: %', SQLERRM;
      END;
      
      -- TODO: Aqui você pode adicionar uma chamada HTTP para enviar notificação
      -- usando pg_net ou http extension se quiser notificar o referrer
      
    ELSE
      RAISE NOTICE '[I20 Rewards Trigger] No referral code found for user: %', NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar o trigger
DROP TRIGGER IF EXISTS trigger_i20_payment_rewards ON user_profiles;
CREATE TRIGGER trigger_i20_payment_rewards
  AFTER UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_i20_payment_rewards();

-- Comentário
COMMENT ON FUNCTION handle_i20_payment_rewards() IS 
'Trigger function que credita 180 MatriculaCoins automaticamente quando has_paid_i20_control_fee muda para true. Funciona para todos os métodos de pagamento.';

COMMENT ON TRIGGER trigger_i20_payment_rewards ON user_profiles IS
'Trigger que executa handle_i20_payment_rewards() quando I20 é marcado como pago';
