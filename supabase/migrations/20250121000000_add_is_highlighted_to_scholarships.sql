-- Adiciona coluna is_highlighted na tabela scholarships
ALTER TABLE scholarships 
ADD COLUMN IF NOT EXISTS is_highlighted BOOLEAN DEFAULT FALSE;

-- Cria índice para melhorar performance das consultas de destaque
CREATE INDEX IF NOT EXISTS idx_scholarships_is_highlighted ON scholarships(is_highlighted);

-- Atualiza algumas bolsas existentes para serem destacadas (opcional)
-- UPDATE scholarships SET is_highlighted = TRUE WHERE id IN (1, 2, 3, 4, 5, 6);
