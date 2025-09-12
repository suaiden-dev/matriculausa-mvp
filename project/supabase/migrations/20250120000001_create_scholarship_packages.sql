/*
  # Sistema de Pacotes de Bolsas - Taxas Dinâmicas
  
  1. Nova Tabela
    - `scholarship_packages` - Pacotes de bolsas com taxas específicas
    
  2. Modificações
    - Adicionar campo `scholarship_package_id` em `user_profiles`
    
  3. Políticas
    - Políticas para acesso aos pacotes
*/

-- Criar tabela de pacotes de bolsas
CREATE TABLE IF NOT EXISTS scholarship_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  package_number integer NOT NULL UNIQUE,
  selection_process_fee numeric(10,2) NOT NULL,
  i20_control_fee numeric(10,2) NOT NULL,
  scholarship_fee numeric(10,2) NOT NULL,
  total_paid numeric(10,2) NOT NULL,
  scholarship_amount numeric(10,2) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Inserir os 5 pacotes pré-definidos
INSERT INTO scholarship_packages (
  name, 
  description, 
  package_number, 
  selection_process_fee, 
  i20_control_fee, 
  scholarship_fee, 
  total_paid, 
  scholarship_amount
) VALUES 
(
  'Pacote 1',
  'Pacote com maior investimento inicial e menor valor de bolsa',
  1,
  1299.00,
  1299.00,
  400.00,
  2998.00,
  3800.00
),
(
  'Pacote 2',
  'Pacote com investimento médio-alto e bolsa intermediária',
  2,
  999.00,
  999.00,
  400.00,
  2398.00,
  4200.00
),
(
  'Pacote 3',
  'Pacote com investimento médio e bolsa intermediária',
  3,
  900.00,
  900.00,
  400.00,
  2200.00,
  4500.00
),
(
  'Pacote 4',
  'Pacote com investimento baixo-médio e bolsa alta',
  4,
  700.00,
  700.00,
  400.00,
  1800.00,
  5000.00
),
(
  'Pacote 5',
  'Pacote com menor investimento inicial e maior valor de bolsa',
  5,
  500.00,
  500.00,
  400.00,
  1400.00,
  5500.00
);

-- Adicionar campo scholarship_package_id na tabela user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS scholarship_package_id uuid REFERENCES scholarship_packages(id);

-- Enable RLS
ALTER TABLE scholarship_packages ENABLE ROW LEVEL SECURITY;

-- Políticas para scholarship_packages
CREATE POLICY "Anyone can view active scholarship packages"
  ON scholarship_packages
  FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

CREATE POLICY "Only admins can manage scholarship packages"
  ON scholarship_packages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_scholarship_packages_package_number ON scholarship_packages(package_number);
CREATE INDEX IF NOT EXISTS idx_scholarship_packages_is_active ON scholarship_packages(is_active);
CREATE INDEX IF NOT EXISTS idx_user_profiles_scholarship_package_id ON user_profiles(scholarship_package_id);

-- Função para obter pacote por número
CREATE OR REPLACE FUNCTION get_scholarship_package_by_number(package_number_param integer)
RETURNS scholarship_packages AS $$
DECLARE
  package_record scholarship_packages;
BEGIN
  SELECT * INTO package_record
  FROM scholarship_packages
  WHERE package_number = package_number_param
  AND is_active = true;
  
  RETURN package_record;
END;
$$ LANGUAGE plpgsql;

-- Função para obter taxas do pacote do usuário
CREATE OR REPLACE FUNCTION get_user_package_fees(user_id_param uuid)
RETURNS TABLE (
  selection_process_fee numeric,
  i20_control_fee numeric,
  scholarship_fee numeric,
  total_paid numeric,
  scholarship_amount numeric,
  package_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.selection_process_fee,
    sp.i20_control_fee,
    sp.scholarship_fee,
    sp.total_paid,
    sp.scholarship_amount,
    sp.name as package_name
  FROM user_profiles up
  JOIN scholarship_packages sp ON up.scholarship_package_id = sp.id
  WHERE up.user_id = user_id_param
  AND sp.is_active = true;
END;
$$ LANGUAGE plpgsql;
