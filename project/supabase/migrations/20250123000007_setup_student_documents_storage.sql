-- Configuração do bucket de storage para documentos dos estudantes
-- Esta migração configura o bucket e as políticas RLS necessárias

-- Criar o bucket se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-documents',
  'student-documents',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- Política RLS para permitir que usuários autenticados vejam documentos
CREATE POLICY "Allow authenticated users to view student documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'student-documents' 
  AND auth.role() = 'authenticated'
);

-- Política RLS para permitir que usuários autenticados façam upload de documentos
CREATE POLICY "Allow authenticated users to upload student documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'student-documents' 
  AND auth.role() = 'authenticated'
);

-- Política RLS para permitir que usuários autenticados atualizem seus próprios documentos
CREATE POLICY "Allow authenticated users to update their own documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'student-documents' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Política RLS para permitir que usuários autenticados deletem seus próprios documentos
CREATE POLICY "Allow authenticated users to delete their own documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'student-documents' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Garantir que o bucket seja público para visualização
UPDATE storage.buckets 
SET public = true 
WHERE id = 'student-documents';
