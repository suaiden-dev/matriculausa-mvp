-- Adiciona a coluna para rastrear o tipo de processo do aluno (Initial, Transfer, etc.)
ALTER TABLE public.scholarship_applications
ADD COLUMN student_process_type TEXT;

-- Cria a tabela para armazenar documentos enviados pela escola para o aluno
CREATE TABLE public.scholarship_application_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES public.scholarship_applications(id) ON DELETE CASCADE,
    document_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_by_user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Habilita Row-Level Security para a nova tabela
ALTER TABLE public.scholarship_application_documents ENABLE ROW LEVEL SECURITY;

-- Permite que administradores e o próprio aluno (se a aplicação for dele) leiam os documentos
CREATE POLICY "Enable read access for admins and the student owner"
ON public.scholarship_application_documents
FOR SELECT
USING (
  auth.uid() IS NOT NULL
);

-- Permite que administradores criem documentos
CREATE POLICY "Enable insert for admins"
ON public.scholarship_application_documents
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Permite que administradores deletem documentos
CREATE POLICY "Enable delete for admins"
ON public.scholarship_application_documents
FOR DELETE
USING (
  auth.uid() IS NOT NULL
); 