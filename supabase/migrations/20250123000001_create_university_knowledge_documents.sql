-- Criar tabela university_knowledge_documents para base de conhecimento das universidades
CREATE TABLE IF NOT EXISTS public.university_knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid REFERENCES universities(id) ON DELETE CASCADE,
  document_name text NOT NULL,
  file_url text NOT NULL,
  file_size bigint,
  mime_type text,
  transcription_status text DEFAULT 'pending' CHECK (transcription_status IN ('pending', 'processing', 'completed', 'error')),
  transcription_text text,
  webhook_result jsonb,
  uploaded_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.university_knowledge_documents ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Users can view their university knowledge documents" ON public.university_knowledge_documents
  FOR SELECT USING (
    university_id IN (
      SELECT id FROM universities WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their university knowledge documents" ON public.university_knowledge_documents
  FOR INSERT WITH CHECK (
    university_id IN (
      SELECT id FROM universities WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their university knowledge documents" ON public.university_knowledge_documents
  FOR UPDATE USING (
    university_id IN (
      SELECT id FROM universities WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their university knowledge documents" ON public.university_knowledge_documents
  FOR DELETE USING (
    university_id IN (
      SELECT id FROM universities WHERE user_id = auth.uid()
    )
  );

-- Criar índices para performance
CREATE INDEX idx_university_knowledge_documents_university_id ON public.university_knowledge_documents(university_id);
CREATE INDEX idx_university_knowledge_documents_transcription_status ON public.university_knowledge_documents(transcription_status);
CREATE INDEX idx_university_knowledge_documents_uploaded_by ON public.university_knowledge_documents(uploaded_by_user_id);
CREATE INDEX idx_university_knowledge_documents_created_at ON public.university_knowledge_documents(created_at);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_university_knowledge_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_university_knowledge_documents_updated_at
  BEFORE UPDATE ON public.university_knowledge_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_university_knowledge_documents_updated_at();
