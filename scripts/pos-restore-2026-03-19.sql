-- ============================================================
-- SCRIPT DE LIMPEZA / VERIFICAÇÃO PÓS-RESTORE (VERSÃO SIMPLIFICADA)
-- Data: 2026-03-19
-- ============================================================

-- ============================================================
-- PASSO 1: MIGRATION DO DIA
-- Garante que a coluna 'selected_application_id' existe após o restore
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_profiles'
    AND column_name = 'selected_application_id'
  ) THEN
    ALTER TABLE public.user_profiles
    ADD COLUMN selected_application_id uuid REFERENCES public.scholarship_applications(id) ON DELETE SET NULL;
  END IF;
END $$;


-- ============================================================
-- PASSO 2: VERIFICAÇÃO FINAL DE INTEGRIDADE
-- Execute para confirmar que o banco está saudável
-- ============================================================

SELECT 'Total de Bolsas de Estudo' as item, count(*) as total
FROM public.scholarships

UNION ALL

SELECT 'Total de Universidades', count(*)
FROM public.universities

UNION ALL

SELECT 'Aplicações de Bolsas (Total)', count(*)
FROM public.scholarship_applications

UNION ALL

SELECT 'Perfis de Usuários (Total)', count(*)
FROM public.user_profiles;
