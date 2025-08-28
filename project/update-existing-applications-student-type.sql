-- Script para atualizar aplicações existentes com student_process_type
-- Execute este script no SQL Editor do Supabase Dashboard

-- 1. VERIFICAR APLICAÇÕES EXISTENTES SEM student_process_type
SELECT 
  'Verificando aplicações sem student_process_type' as step;

SELECT 
  COUNT(*) as total_applications,
  COUNT(student_process_type) as with_student_type,
  COUNT(*) - COUNT(student_process_type) as without_student_type
FROM public.scholarship_applications;

-- 2. VERIFICAR APLICAÇÕES ESPECÍFICAS SEM student_process_type
SELECT 
  'Detalhes das aplicações sem student_process_type' as step;

SELECT 
  sa.id,
  sa.student_id,
  sa.scholarship_id,
  sa.status,
  sa.created_at,
  up.full_name,
  up.email,
  s.title as scholarship_title,
  u.name as university_name
FROM public.scholarship_applications sa
LEFT JOIN user_profiles up ON sa.student_id = up.id
LEFT JOIN scholarships s ON sa.scholarship_id = s.id
LEFT JOIN universities u ON s.university_id = u.id
WHERE sa.student_process_type IS NULL
ORDER BY sa.created_at DESC
LIMIT 20;

-- 3. VERIFICAR SE HÁ DADOS NO localStorage DOS USUÁRIOS
-- (Isso seria feito via aplicação, mas podemos verificar se há padrões)
SELECT 
  'Verificando padrões nos perfis dos usuários' as step;

SELECT 
  up.role,
  COUNT(*) as total_profiles,
  COUNT(up.selected_scholarship_id) as with_selected_scholarship,
  COUNT(up.documents_status) as with_documents_status
FROM user_profiles up
GROUP BY up.role
ORDER BY up.role;

-- 4. ATUALIZAR APLICAÇÕES EXISTENTES COM VALOR PADRÃO
-- (Apenas se não houver student_process_type)
SELECT 
  'Atualizando aplicações existentes com valor padrão' as step;

UPDATE public.scholarship_applications 
SET student_process_type = 'initial'
WHERE student_process_type IS NULL
  AND status IN ('pending', 'under_review', 'approved');

-- 5. VERIFICAR RESULTADO DA ATUALIZAÇÃO
SELECT 
  'Verificando resultado da atualização' as step;

SELECT 
  COUNT(*) as total_applications,
  COUNT(student_process_type) as with_student_type,
  COUNT(*) - COUNT(student_process_type) as without_student_type
FROM public.scholarship_applications;

-- 6. VERIFICAR APLICAÇÕES ATUALIZADAS
SELECT 
  'Verificando aplicações atualizadas' as step;

SELECT 
  sa.id,
  sa.student_id,
  sa.scholarship_id,
  sa.status,
  sa.student_process_type,
  sa.created_at,
  up.full_name,
  up.email
FROM public.scholarship_applications sa
LEFT JOIN user_profiles up ON sa.student_id = up.id
WHERE sa.student_process_type = 'initial'
  AND sa.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY sa.created_at DESC
LIMIT 10;

-- 7. VERIFICAR SE HÁ PROBLEMAS DE CONSTRAINT
SELECT 
  'Verificando constraints' as step;

SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'scholarship_applications'::regclass;

-- 8. VERIFICAR SE HÁ PROBLEMAS DE RLS
SELECT 
  'Verificando políticas RLS' as step;

SELECT 
  policyname,
  permissive,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'scholarship_applications';

-- 9. CRIAR ÍNDICE PARA MELHORAR PERFORMANCE (se não existir)
SELECT 
  'Criando índice para student_process_type' as step;

CREATE INDEX IF NOT EXISTS idx_scholarship_applications_student_process_type 
ON public.scholarship_applications(student_process_type);

-- 10. VERIFICAR ESTRUTURA FINAL DA TABELA
SELECT 
  'Estrutura final da tabela' as step;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns 
WHERE table_name = 'scholarship_applications'
ORDER BY ordinal_position;

-- 11. VERIFICAR SE HÁ APLICAÇÕES COM VALORES INVÁLIDOS
SELECT 
  'Verificando valores válidos de student_process_type' as step;

SELECT 
  student_process_type,
  COUNT(*) as count
FROM public.scholarship_applications 
WHERE student_process_type IS NOT NULL
GROUP BY student_process_type
ORDER BY count DESC;

-- 12. RECOMENDAÇÕES
SELECT 
  'Recomendações' as step,
  '1. Execute este script regularmente para manter consistência' as recommendation_1,
  '2. Verifique os logs das Edge Functions para identificar problemas' as recommendation_2,
  '3. Considere adicionar validação no frontend para garantir que o tipo seja sempre selecionado' as recommendation_3,
  '4. Monitore se novas aplicações estão sendo criadas com student_process_type' as recommendation_4;
