-- =====================================================
-- Migration: Criar bucket legal-documents no Storage
-- =====================================================
-- Cria o bucket e políticas RLS para armazenar PDFs de documentos legais
-- =====================================================

-- Criar o bucket se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'legal-documents',
  'legal-documents',
  false, -- Bucket privado (não público)
  10485760, -- 10MB limite por arquivo
  ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Políticas RLS para o bucket legal-documents
-- =====================================================

-- Remover políticas existentes antes de criar (para tornar migration idempotente)
DROP POLICY IF EXISTS "Service role can manage all legal documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all legal documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own legal documents" ON storage.objects;

-- Service role pode fazer tudo (inserir, atualizar, deletar, visualizar)
DROP POLICY IF EXISTS "Service role can manage all legal documents" ON storage.objects;
CREATE POLICY "Service role can manage all legal documents"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'legal-documents')
  WITH CHECK (bucket_id = 'legal-documents');

-- Admins podem visualizar todos os documentos
DROP POLICY IF EXISTS "Admins can view all legal documents" ON storage.objects;
CREATE POLICY "Admins can view all legal documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'legal-documents'
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Usuários podem visualizar seus próprios documentos
-- Estrutura: {user_id}/{document_type}/{filename}
DROP POLICY IF EXISTS "Users can view own legal documents" ON storage.objects;
CREATE POLICY "Users can view own legal documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'legal-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================
-- Verificação
-- =====================================================

DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'legal-documents') THEN
    RAISE NOTICE '✅ Bucket legal-documents criado com sucesso!';
  ELSE
    RAISE WARNING '⚠️ Bucket legal-documents não foi criado. Verifique as permissões.';
  END IF;
END $$;

COMMENT ON TABLE storage.buckets IS 'Bucket legal-documents: Armazena PDFs de documentos legais gerados automaticamente (termos aceitos e contratos)';
