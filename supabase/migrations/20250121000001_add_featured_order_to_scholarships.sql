-- Adiciona coluna featured_order na tabela scholarships para controlar a ordem dos destaques
ALTER TABLE scholarships 
ADD COLUMN featured_order INTEGER;

-- Cria índice para melhorar performance das consultas de ordenação
CREATE INDEX idx_scholarships_featured_order ON scholarships(featured_order);

-- Cria índice composto para otimizar consultas de bolsas em destaque ordenadas
CREATE INDEX idx_scholarships_highlighted_ordered ON scholarships(is_highlighted, featured_order) 
WHERE is_highlighted = TRUE;

-- Comentário explicativo
COMMENT ON COLUMN scholarships.featured_order IS 'Ordem de exibição das bolsas em destaque (1-6). NULL para bolsas não destacadas.';
