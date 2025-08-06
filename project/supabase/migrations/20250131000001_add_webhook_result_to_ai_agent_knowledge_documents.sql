-- Adiciona coluna webhook_result à tabela ai_agent_knowledge_documents
-- Esta coluna armazenará o resultado completo do webhook de transcrição

ALTER TABLE ai_agent_knowledge_documents 
ADD COLUMN IF NOT EXISTS webhook_result JSONB DEFAULT NULL;

-- Adiciona comentário explicativo
COMMENT ON COLUMN ai_agent_knowledge_documents.webhook_result IS 'Armazena o resultado completo do webhook de transcrição, incluindo a transcrição processada e metadados'; 