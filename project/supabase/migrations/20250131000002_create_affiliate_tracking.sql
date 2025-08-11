/*
  # Sistema de Rastreamento de Afiliados - Matricula Coin
  
  1. Novas Tabelas
    - `affiliate_shares` - Registro de compartilhamentos
    - `affiliate_clicks` - Registro de cliques nos links
    
  2. Funções
    - Função para registrar compartilhamentos
    - Função para registrar cliques
    
  3. Políticas
    - Políticas específicas para usuários autenticados
    - Controle de acesso aos dados de rastreamento
*/

-- Criar tabela de compartilhamentos
CREATE TABLE IF NOT EXISTS affiliate_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  affiliate_code_id uuid NOT NULL REFERENCES affiliate_codes(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('facebook', 'twitter', 'linkedin', 'whatsapp', 'email', 'copy', 'other')),
  shared_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de cliques
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  affiliate_code_id uuid NOT NULL REFERENCES affiliate_codes(id) ON DELETE CASCADE,
  clicked_at timestamptz DEFAULT now(),
  ip_address inet,
  user_agent text,
  referrer text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_affiliate_shares_user_id ON affiliate_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_shares_code_id ON affiliate_shares(affiliate_code_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_shares_platform ON affiliate_shares(platform);
CREATE INDEX IF NOT EXISTS idx_affiliate_shares_shared_at ON affiliate_shares(shared_at);

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_user_id ON affiliate_clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_code_id ON affiliate_clicks(affiliate_code_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_clicked_at ON affiliate_clicks(clicked_at);

-- Habilitar RLS
ALTER TABLE affiliate_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- Políticas para affiliate_shares
CREATE POLICY "Users can view their own shares" ON affiliate_shares
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shares" ON affiliate_shares
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas para affiliate_clicks
CREATE POLICY "Users can view their own clicks" ON affiliate_clicks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clicks" ON affiliate_clicks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Função para registrar compartilhamento
CREATE OR REPLACE FUNCTION record_affiliate_share(
  user_id_param uuid,
  affiliate_code_id_param uuid,
  platform_param text
) RETURNS void AS $$
BEGIN
  INSERT INTO affiliate_shares (
    user_id,
    affiliate_code_id,
    platform
  ) VALUES (
    user_id_param,
    affiliate_code_id_param,
    platform_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para registrar clique
CREATE OR REPLACE FUNCTION record_affiliate_click(
  user_id_param uuid,
  affiliate_code_id_param uuid,
  ip_address_param inet DEFAULT NULL,
  user_agent_param text DEFAULT NULL,
  referrer_param text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO affiliate_clicks (
    user_id,
    affiliate_code_id,
    ip_address,
    user_agent,
    referrer
  ) VALUES (
    user_id_param,
    affiliate_code_id_param,
    ip_address_param,
    user_agent_param,
    referrer_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter estatísticas de compartilhamento
CREATE OR REPLACE FUNCTION get_affiliate_share_stats(user_id_param uuid)
RETURNS TABLE (
  platform text,
  share_count bigint,
  click_count bigint,
  conversion_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.platform,
    COUNT(DISTINCT s.id) as share_count,
    COUNT(DISTINCT c.id) as click_count,
    CASE 
      WHEN COUNT(DISTINCT s.id) > 0 THEN 
        ROUND((COUNT(DISTINCT c.id)::numeric / COUNT(DISTINCT s.id)::numeric) * 100, 2)
      ELSE 0 
    END as conversion_rate
  FROM affiliate_shares s
  LEFT JOIN affiliate_clicks c ON s.affiliate_code_id = c.affiliate_code_id
  WHERE s.user_id = user_id_param
  GROUP BY s.platform
  ORDER BY share_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 