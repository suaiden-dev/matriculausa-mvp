-- Adicionar políticas RLS para university_ai_settings
-- Primeiro, habilitar RLS na tabela se ainda não estiver habilitada
ALTER TABLE university_ai_settings ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários autenticados leiam configurações de universidades
CREATE POLICY "Users can read university AI settings" ON university_ai_settings
FOR SELECT TO authenticated
USING (true);

-- Política para permitir que usuários autenticados insiram configurações de universidades
CREATE POLICY "Users can insert university AI settings" ON university_ai_settings
FOR INSERT TO authenticated
WITH CHECK (true);

-- Política para permitir que usuários autenticados atualizem configurações de universidades
CREATE POLICY "Users can update university AI settings" ON university_ai_settings
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

-- Política para permitir que usuários autenticados deletem configurações de universidades
CREATE POLICY "Users can delete university AI settings" ON university_ai_settings
FOR DELETE TO authenticated
USING (true); 