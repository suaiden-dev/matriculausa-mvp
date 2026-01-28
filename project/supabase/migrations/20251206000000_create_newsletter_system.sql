/*
  # Sistema de Newsletter Anti-Spam - MatriculaUSA

  1. Novas Tabelas
    - `newsletter_campaigns` - Configuração de campanhas/cenários
    - `newsletter_sent_emails` - Rastreamento de emails enviados
    - `newsletter_user_preferences` - Preferências e controle do usuário
    
  2. Funções
    - `get_eligible_users_for_campaign(campaign_key)` - Busca usuários elegíveis
    - `check_user_can_receive_email(user_id)` - Verifica rate limit e opt-out
    
  3. Políticas RLS
    - Usuários só veem seus próprios dados
    - Admins podem ver tudo
    
  4. Índices
    - Para performance em queries de rate limiting e cooldown
*/

-- ============================================================================
-- TABELA: newsletter_campaigns
-- ============================================================================
CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  email_subject_template text NOT NULL,
  email_body_template text NOT NULL,
  trigger_conditions jsonb DEFAULT '{}',
  cooldown_days integer DEFAULT 7,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE newsletter_campaigns IS 'Configuração de campanhas de newsletter/campanhas de incentivo';
COMMENT ON COLUMN newsletter_campaigns.campaign_key IS 'Chave única da campanha (ex: registered_no_payment, paid_no_application)';
COMMENT ON COLUMN newsletter_campaigns.trigger_conditions IS 'Condições JSON para identificar usuários elegíveis';
COMMENT ON COLUMN newsletter_campaigns.cooldown_days IS 'Dias mínimos entre emails desta campanha para o mesmo usuário';

-- ============================================================================
-- TABELA: newsletter_sent_emails
-- ============================================================================
CREATE TABLE IF NOT EXISTS newsletter_sent_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  campaign_id uuid REFERENCES newsletter_campaigns(id) ON DELETE CASCADE NOT NULL,
  email_address text NOT NULL,
  subject text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  status text DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE newsletter_sent_emails IS 'Rastreamento de todos os emails de newsletter enviados';
COMMENT ON COLUMN newsletter_sent_emails.status IS 'Status do envio: pending, sent, failed, bounced';

-- ============================================================================
-- TABELA: newsletter_user_preferences
-- ============================================================================
CREATE TABLE IF NOT EXISTS newsletter_user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email_opt_out boolean DEFAULT false,
  opt_out_reason text,
  opt_out_at timestamptz,
  last_email_sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE newsletter_user_preferences IS 'Preferências e controle de newsletter por usuário';
COMMENT ON COLUMN newsletter_user_preferences.email_opt_out IS 'Se o usuário optou por não receber emails de newsletter';
COMMENT ON COLUMN newsletter_user_preferences.last_email_sent_at IS 'Timestamp do último email enviado (qualquer campanha)';

-- ============================================================================
-- ÍNDICES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_key ON newsletter_campaigns(campaign_key);
CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_active ON newsletter_campaigns(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_newsletter_sent_emails_user_id ON newsletter_sent_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_sent_emails_campaign_id ON newsletter_sent_emails(campaign_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_sent_emails_sent_at ON newsletter_sent_emails(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletter_sent_emails_user_sent_at ON newsletter_sent_emails(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletter_sent_emails_campaign_sent_at ON newsletter_sent_emails(campaign_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletter_sent_emails_status ON newsletter_sent_emails(status);

CREATE INDEX IF NOT EXISTS idx_newsletter_user_preferences_user_id ON newsletter_user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_user_preferences_opt_out ON newsletter_user_preferences(email_opt_out) WHERE email_opt_out = false;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE newsletter_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_sent_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_user_preferences ENABLE ROW LEVEL SECURITY;

-- Políticas para newsletter_campaigns (apenas admins podem ver/editar)
CREATE POLICY "Admins can view all campaigns"
  ON newsletter_campaigns
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage campaigns"
  ON newsletter_campaigns
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Políticas para newsletter_sent_emails
CREATE POLICY "Users can view their own sent emails"
  ON newsletter_sent_emails
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all sent emails"
  ON newsletter_sent_emails
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Service role pode inserir/atualizar (para Edge Functions)
CREATE POLICY "Service role can manage sent emails"
  ON newsletter_sent_emails
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Políticas para newsletter_user_preferences
CREATE POLICY "Users can view their own preferences"
  ON newsletter_user_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences"
  ON newsletter_user_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert their own preferences"
  ON newsletter_user_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all preferences"
  ON newsletter_user_preferences
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Service role pode inserir/atualizar (para Edge Functions)
CREATE POLICY "Service role can manage preferences"
  ON newsletter_user_preferences
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- FUNÇÕES SQL AUXILIARES
-- ============================================================================

-- Função para verificar se usuário pode receber email
-- ✅ ATUALIZADA: Agora exige opt-in explícito (GDPR/LGPD compliance)
CREATE OR REPLACE FUNCTION check_user_can_receive_email(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_opt_out boolean;
  v_opt_in boolean;
  v_last_email_sent timestamptz;
  v_hours_since_last_email numeric;
BEGIN
  -- Verificar preferências de newsletter
  SELECT email_opt_out, email_opt_in, last_email_sent_at
  INTO v_opt_out, v_opt_in, v_last_email_sent
  FROM newsletter_user_preferences
  WHERE user_id = p_user_id;
  
  -- Se não tem registro de preferências, não pode receber (opt-in explícito requerido)
  IF v_opt_out IS NULL AND v_opt_in IS NULL THEN
    RETURN false;
  END IF;
  
  -- Se optou por sair, não pode receber
  IF v_opt_out = true THEN
    RETURN false;
  END IF;
  
  -- ✅ NOVO: Se não consentiu explicitamente (opt_in é NULL ou false), não pode receber
  IF v_opt_in IS NULL OR v_opt_in = false THEN
    RETURN false;
  END IF;
  
  -- Verificar rate limit: máximo 1 email por dia (24 horas)
  -- Só verifica se o usuário consentiu (opt_in = true)
  IF v_last_email_sent IS NOT NULL THEN
    v_hours_since_last_email := EXTRACT(EPOCH FROM (NOW() - v_last_email_sent)) / 3600;
    IF v_hours_since_last_email < 24 THEN
      RETURN false;
    END IF;
  END IF;
  
  -- Se chegou aqui, usuário consentiu e passou no rate limit
  RETURN true;
END;
$$;

COMMENT ON FUNCTION check_user_can_receive_email IS 'Verifica se usuário pode receber email. Exige opt-in explícito (email_opt_in = true), verifica opt-out e rate limit (máximo 1 email por 24h). GDPR/LGPD compliant.';

-- Função para buscar usuários elegíveis para uma campanha
CREATE OR REPLACE FUNCTION get_eligible_users_for_campaign(p_campaign_key text, p_limit integer DEFAULT 50)
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  user_profile_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_campaign_id uuid;
  v_cooldown_days integer;
  v_trigger_conditions jsonb;
BEGIN
  -- Buscar campanha
  SELECT id, cooldown_days, trigger_conditions
  INTO v_campaign_id, v_cooldown_days, v_trigger_conditions
  FROM newsletter_campaigns
  WHERE campaign_key = p_campaign_key
    AND is_active = true;
  
  IF v_campaign_id IS NULL THEN
    RAISE EXCEPTION 'Campanha não encontrada ou inativa: %', p_campaign_key;
  END IF;
  
  -- Retornar usuários elegíveis baseado na campanha
  -- Esta função será customizada por campanha, mas aqui está a estrutura base
  RETURN QUERY
  SELECT DISTINCT
    u.id as user_id,
    u.email::text,
    COALESCE(up.full_name, '')::text as full_name,
    up.id as user_profile_id
  FROM auth.users u
  INNER JOIN user_profiles up ON up.user_id = u.id
  WHERE 
    -- Não optou por sair e pode receber email (rate limit)
    check_user_can_receive_email(u.id) = true
    -- Não recebeu email desta campanha no cooldown
    AND NOT EXISTS (
      SELECT 1 FROM newsletter_sent_emails nse
      WHERE nse.user_id = u.id
        AND nse.campaign_id = v_campaign_id
        AND nse.sent_at > NOW() - (v_cooldown_days || ' days')::interval
    )
    -- Usuário ativo (não deletado)
    AND u.deleted_at IS NULL
    -- Perfil ativo
    AND (up.status IS NULL OR up.status = 'active')
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_eligible_users_for_campaign IS 'Retorna usuários elegíveis para uma campanha aplicando todos os filtros';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Criar função update_updated_at_column se não existir
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_newsletter_campaigns_updated_at
  BEFORE UPDATE ON newsletter_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_newsletter_user_preferences_updated_at
  BEFORE UPDATE ON newsletter_user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INSERIR CAMPANHAS INICIAIS
-- ============================================================================

-- Campanha 1: Usuário registrado sem pagar Selection Process Fee
INSERT INTO newsletter_campaigns (
  campaign_key,
  name,
  description,
  email_subject_template,
  email_body_template,
  cooldown_days,
  is_active
) VALUES (
  'registered_no_payment',
  'Usuário Registrado Sem Pagamento',
  'Envia email para usuários que se registraram mas não pagaram a Selection Process Fee',
  'Complete seu cadastro e comece sua jornada acadêmica nos EUA',
  '<html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #05294E;">Olá, {{full_name}}!</h1>
        <p>Notamos que você se registrou no MatriculaUSA, mas ainda não completou o pagamento da taxa de processo seletivo.</p>
        <p>A Selection Process Fee é o primeiro passo para começar sua jornada acadêmica nos Estados Unidos. Com ela, você poderá:</p>
        <ul>
          <li>Acessar nosso sistema completo de bolsas de estudo</li>
          <li>Aplicar para múltiplas universidades</li>
          <li>Receber suporte completo durante todo o processo</li>
        </ul>
        <p style="margin: 30px 0;">
          <a href="{{payment_url}}" style="background-color: #05294E; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Pagar Selection Process Fee</a>
        </p>
        <p>Se você tiver alguma dúvida, nossa equipe está pronta para ajudar!</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #999;">
          Não deseja mais receber estes emails? 
          <a href="{{unsubscribe_url}}">Clique aqui para cancelar a inscrição</a>
        </p>
      </div>
    </body>
  </html>',
  7,
  true
) ON CONFLICT (campaign_key) DO NOTHING;

-- Campanha 2: Pagou Selection Process Fee mas não criou aplicação
INSERT INTO newsletter_campaigns (
  campaign_key,
  name,
  description,
  email_subject_template,
  email_body_template,
  cooldown_days,
  is_active
) VALUES (
  'paid_no_application',
  'Pagou Taxa Mas Não Aplicou',
  'Envia email para usuários que pagaram a Selection Process Fee mas não criaram aplicação de bolsa',
  'Aplique para bolsas de estudo e realize seu sonho acadêmico',
  '<html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #05294E;">Parabéns, {{full_name}}!</h1>
        <p>Você já pagou a Selection Process Fee e deu o primeiro passo importante na sua jornada acadêmica!</p>
        <p>O próximo passo é criar sua aplicação de bolsa de estudo. Com sua aplicação, você poderá:</p>
        <ul>
          <li>Escolher entre centenas de bolsas disponíveis</li>
          <li>Enviar documentos para análise</li>
          <li>Receber aprovação e começar seus estudos nos EUA</li>
        </ul>
        <p style="margin: 30px 0;">
          <a href="{{scholarships_url}}" style="background-color: #05294E; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Ver Bolsas Disponíveis</a>
        </p>
        <p>Não perca tempo! As bolsas são limitadas e os prazos podem estar se aproximando.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #999;">
          Não deseja mais receber estes emails? 
          <a href="{{unsubscribe_url}}">Clique aqui para cancelar a inscrição</a>
        </p>
      </div>
    </body>
  </html>',
  7,
  true
) ON CONFLICT (campaign_key) DO NOTHING;

