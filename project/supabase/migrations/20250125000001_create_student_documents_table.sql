-- Criar tabela student_documents para armazenar documentos dos estudantes
CREATE TABLE IF NOT EXISTS public.student_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('passport', 'diploma', 'funds_proof')),
    file_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'changes_requested')),
    uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_student_documents_user_id ON public.student_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_student_documents_type ON public.student_documents(type);
CREATE INDEX IF NOT EXISTS idx_student_documents_status ON public.student_documents(status);
CREATE INDEX IF NOT EXISTS idx_student_documents_uploaded_at ON public.student_documents(uploaded_at);

-- Habilitar Row Level Security
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem seus próprios documentos
CREATE POLICY "Users can view their own documents" ON public.student_documents
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Política para usuários inserirem seus próprios documentos
CREATE POLICY "Users can insert their own documents" ON public.student_documents
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Política para usuários atualizarem seus próprios documentos
CREATE POLICY "Users can update their own documents" ON public.student_documents
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Política para usuários deletarem seus próprios documentos
CREATE POLICY "Users can delete their own documents" ON public.student_documents
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Política para administradores verem todos os documentos
CREATE POLICY "Admins can view all documents" ON public.student_documents
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
);

-- Política para administradores atualizarem todos os documentos
CREATE POLICY "Admins can update all documents" ON public.student_documents
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
);

-- Política para escolas verem documentos de seus estudantes
CREATE POLICY "Schools can view their students documents" ON public.student_documents
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles up
        JOIN scholarships s ON s.university_id = up.university_id
        JOIN scholarship_applications sa ON sa.student_id = up.id AND sa.scholarship_id = s.id
        WHERE up.user_id = student_documents.user_id
        AND up.university_id IN (
            SELECT university_id FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'school'
        )
    )
);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_student_documents_updated_at 
    BEFORE UPDATE ON public.student_documents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
