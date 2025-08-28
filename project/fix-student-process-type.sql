-- Script para verificar e corrigir o problema do campo student_process_type
-- Execute este script no SQL Editor do Supabase Dashboard

-- 1. VERIFICAR SE O CAMPO EXISTE
SELECT 
  'Verificando se student_process_type existe' as step;

SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'scholarship_applications' 
  AND column_name = 'student_process_type';

-- 2. SE O CAMPO NÃO EXISTIR, ADICIONAR
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scholarship_applications' 
    AND column_name = 'student_process_type'
  ) THEN
    ALTER TABLE public.scholarship_applications ADD COLUMN student_process_type TEXT;
    RAISE NOTICE 'Campo student_process_type adicionado com sucesso';
  ELSE
    RAISE NOTICE 'Campo student_process_type já existe';
  END IF;
END $$;

-- 3. VERIFICAR SE O CAMPO FOI CRIADO
SELECT 
  'Verificando se o campo foi criado' as step;

SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'scholarship_applications' 
  AND column_name = 'student_process_type';

-- 4. VERIFICAR DADOS EXISTENTES
SELECT 
  'Verificando dados existentes' as step;

SELECT 
  id,
  student_id,
  scholarship_id,
  student_process_type,
  status,
  created_at
FROM public.scholarship_applications 
WHERE student_process_type IS NOT NULL
LIMIT 10;

-- 5. VERIFICAR SE HÁ APLICAÇÕES SEM student_process_type
SELECT 
  'Verificando aplicações sem student_process_type' as step;

SELECT 
  COUNT(*) as total_applications,
  COUNT(student_process_type) as with_student_type,
  COUNT(*) - COUNT(student_process_type) as without_student_type
FROM public.scholarship_applications;

-- 6. VERIFICAR ESTRUTURA COMPLETA DA TABELA
SELECT 
  'Estrutura completa da tabela' as step;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns 
WHERE table_name = 'scholarship_applications'
ORDER BY ordinal_position;

-- 7. VERIFICAR SE HÁ PROBLEMAS DE CONSTRAINT
SELECT 
  'Verificando constraints' as step;

SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'scholarship_applications'::regclass;

-- 8. VERIFICAR POLÍTICAS RLS
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
