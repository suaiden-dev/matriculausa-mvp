-- Tabela: university_ratings (avaliação do aluno para a universidade)
CREATE TABLE IF NOT EXISTS public.university_ratings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment text,
    is_flagged boolean DEFAULT false, -- para moderação
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (university_id, student_id)
);

-- Tabela: student_ratings (avaliação da universidade para o aluno)
CREATE TABLE IF NOT EXISTS public.student_ratings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment text,
    is_flagged boolean DEFAULT false, -- para moderação
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (student_id, university_id)
);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_university_ratings_updated_at
BEFORE UPDATE ON public.university_ratings
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_update_student_ratings_updated_at
BEFORE UPDATE ON public.student_ratings
FOR EACH ROW EXECUTE FUNCTION update_timestamp(); 