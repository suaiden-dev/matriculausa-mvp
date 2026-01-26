-- =====================================================
-- Migration: Restringir acesso aos Buckets Sensíveis
-- =====================================================
-- Torna os buckets privados e configura RLS para Admins e Donos.

-- 1. Tornar os buckets privados
UPDATE storage.buckets SET public = false WHERE id IN ('student-documents', 'document-attachments', 'zelle_comprovantes');

-- 2. Limpar políticas antigas que podem conflitar
DROP POLICY IF EXISTS "Admins can view all from zelle_comprovantes bucket" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all legal documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all zelle comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own legal documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own zelle comprovantes" ON storage.objects;

-- 3. Criar políticas robustas e unificadas

-- Política para ADIMNS (Acesso total de leitura em todos os buckets sensíveis)
CREATE POLICY "Admins can view sensitive documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id IN ('legal-documents', 'student-documents', 'document-attachments', 'zelle_comprovantes', 'identity-photos')
  AND (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
);

-- Política para DONOS (Acesso aos seus próprios arquivos baseados no path {user_id}/...)
CREATE POLICY "Users can view own sensitive documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id IN ('legal-documents', 'student-documents', 'document-attachments', 'zelle_comprovantes', 'identity-photos')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Service Role (bypass RLS - já é padrão, mas garantindo acesso total)
CREATE POLICY "Service role full access"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id IN ('legal-documents', 'student-documents', 'document-attachments', 'zelle_comprovantes', 'identity-photos'))
WITH CHECK (bucket_id IN ('legal-documents', 'student-documents', 'document-attachments', 'zelle_comprovantes', 'identity-photos'));

-- 4. Observação sobre zelle_comprovantes: 
-- Atualmente o código do frontend salva em zelle-payments/{user_id}/... mas o bucket se chama zelle_comprovantes.
-- A política de Dono acima cobre o padrão {user_id}/...
