/*
  # Configuração do Storage para Comprovantes Zelle
  
  1. Criar bucket público para comprovantes
  2. Configurar políticas de acesso
  3. Organizar estrutura de pastas para fácil localização
  
  Estrutura de pastas:
  - comprovantes/
    - zelle-payments/
      - {user_id}/
        - {timestamp}_{fee_type}.{ext}
        - {timestamp}_{fee_type}.{ext}
        - ...
*/

-- Criar bucket para comprovantes (se não existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comprovantes', 
  'comprovantes', 
  true, 
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Política para usuários fazerem upload de seus próprios comprovantes
CREATE POLICY "Users can upload their own comprovantes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'comprovantes' 
  AND auth.uid()::text = (storage.foldername(name))[2] -- user_id é o segundo nível da pasta
);

-- Política para usuários visualizarem seus próprios comprovantes
CREATE POLICY "Users can view their own comprovantes"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'comprovantes' 
  AND auth.uid()::text = (storage.foldername(name))[2] -- user_id é o segundo nível da pasta
);

-- Política para admins visualizarem todos os comprovantes
CREATE POLICY "Admins can view all comprovantes"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'comprovantes' 
  AND EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- Política para usuários atualizarem seus próprios comprovantes
CREATE POLICY "Users can update their own comprovantes"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'comprovantes' 
  AND auth.uid()::text = (storage.foldername(name))[2]
)
WITH CHECK (
  bucket_id = 'comprovantes' 
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Política para usuários deletarem seus próprios comprovantes
CREATE POLICY "Users can delete their own comprovantes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'comprovantes' 
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Função para gerar nome de arquivo organizado
CREATE OR REPLACE FUNCTION generate_comprovante_filename(
  p_user_id uuid,
  p_fee_type text,
  p_original_filename text
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_timestamp text;
  v_extension text;
  v_filename text;
BEGIN
  -- Gerar timestamp no formato YYYYMMDD_HHMMSS
  v_timestamp := to_char(now(), 'YYYYMMDD_HHMMSS');
  
  -- Extrair extensão do arquivo original
  v_extension := lower(split_part(p_original_filename, '.', -1));
  
  -- Gerar nome do arquivo: timestamp_fee_type.extension
  v_filename := v_timestamp || '_' || p_fee_type || '.' || v_extension;
  
  -- Retornar caminho completo: zelle-payments/{user_id}/{filename}
  RETURN 'zelle-payments/' || p_user_id || '/' || v_filename;
END;
$$;

-- Comentários para documentação
COMMENT ON FUNCTION generate_comprovante_filename IS 'Gera nome de arquivo organizado para comprovantes Zelle';
COMMENT ON TABLE storage.buckets IS 'Bucket público para armazenar comprovantes de pagamento Zelle';

-- Exemplo de uso da função:
-- SELECT generate_comprovante_filename('123e4567-e89b-12d3-a456-426614174000', 'selection_process', 'comprovante.jpg');
-- Resultado: zelle-payments/123e4567-e89b-12d3-a456-426614174000/20250122_143022_selection_process.jpg
