/*
  # Sistema de Administração Completo

  1. Novas Tabelas
    - `user_profiles` - Perfis detalhados dos usuários
    - `admin_logs` - Logs de ações administrativas
    
  2. Funções
    - Função para promover usuários a admin
    - Função para logs de auditoria
    
  3. Políticas
    - Políticas específicas para administradores
    - Controle de acesso administrativo
    
  4. Triggers
    - Logs automáticos de mudanças importantes
*/

-- Criar tabela de perfis de usuário
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name text,
  phone text,
  country text,
  field_of_interest text,
  academic_level text,
  gpa numeric(3,2),
  english_proficiency text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  last_active timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de logs administrativos
CREATE TABLE IF NOT EXISTS admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  target_type text NOT NULL, -- 'user', 'university', 'scholarship', etc.
  target_id uuid,
  details jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Criar tabela de aplicações de bolsas
CREATE TABLE IF NOT EXISTS scholarship_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  scholarship_id uuid REFERENCES scholarships(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'under_review')),
  applied_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  notes text,
  documents jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, scholarship_id)
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scholarship_applications ENABLE ROW LEVEL SECURITY;

-- Políticas para user_profiles
CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Políticas para admin_logs (apenas admins podem ver)
CREATE POLICY "Admins can view all logs"
  ON admin_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can insert logs"
  ON admin_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Políticas para scholarship_applications
CREATE POLICY "Students can view their own applications"
  ON scholarship_applications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own applications"
  ON scholarship_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "University owners can view applications for their scholarships"
  ON scholarship_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM scholarships s
      JOIN universities u ON s.university_id = u.id
      WHERE s.id = scholarship_applications.scholarship_id
      AND u.user_id = auth.uid()
    )
  );

CREATE POLICY "University owners can update applications for their scholarships"
  ON scholarship_applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM scholarships s
      JOIN universities u ON s.university_id = u.id
      WHERE s.id = scholarship_applications.scholarship_id
      AND u.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM scholarships s
      JOIN universities u ON s.university_id = u.id
      WHERE s.id = scholarship_applications.scholarship_id
      AND u.user_id = auth.uid()
    )
  );

-- Admins podem ver e gerenciar tudo
CREATE POLICY "Admins can manage all applications"
  ON scholarship_applications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Função para log de ações administrativas
CREATE OR REPLACE FUNCTION log_admin_action(
  action_text text,
  target_type_text text,
  target_id_param uuid DEFAULT NULL,
  details_param jsonb DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  INSERT INTO admin_logs (
    admin_user_id,
    action,
    target_type,
    target_id,
    details
  ) VALUES (
    auth.uid(),
    action_text,
    target_type_text,
    target_id_param,
    details_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para promover usuário a admin
CREATE OR REPLACE FUNCTION promote_user_to_admin(target_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can promote users';
  END IF;
  
  -- Atualizar o role do usuário
  UPDATE auth.users 
  SET raw_user_meta_data = 
    COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', 'admin')
  WHERE id = target_user_id;
  
  -- Log da ação
  PERFORM log_admin_action(
    'promote_to_admin',
    'user',
    target_user_id,
    jsonb_build_object('promoted_by', auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para aprovar universidade
CREATE OR REPLACE FUNCTION approve_university(university_id_param uuid)
RETURNS void AS $$
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can approve universities';
  END IF;
  
  -- Aprovar a universidade
  UPDATE universities 
  SET is_approved = true, updated_at = now()
  WHERE id = university_id_param;
  
  -- Log da ação
  PERFORM log_admin_action(
    'approve_university',
    'university',
    university_id_param,
    jsonb_build_object('approved_by', auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para rejeitar universidade
CREATE OR REPLACE FUNCTION reject_university(university_id_param uuid, reason_text text DEFAULT '')
RETURNS void AS $$
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can reject universities';
  END IF;
  
  -- Log da ação antes de deletar
  PERFORM log_admin_action(
    'reject_university',
    'university',
    university_id_param,
    jsonb_build_object('rejected_by', auth.uid(), 'reason', reason_text)
  );
  
  -- Deletar a universidade
  DELETE FROM universities WHERE id = university_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_user_id ON admin_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_scholarship_applications_student_id ON scholarship_applications(student_id);
CREATE INDEX IF NOT EXISTS idx_scholarship_applications_scholarship_id ON scholarship_applications(scholarship_id);
CREATE INDEX IF NOT EXISTS idx_scholarship_applications_status ON scholarship_applications(status);

-- Triggers para updated_at
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scholarship_applications_updated_at 
  BEFORE UPDATE ON scholarship_applications 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir um perfil automático quando um usuário se registra
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_profiles (user_id, full_name, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'active'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();