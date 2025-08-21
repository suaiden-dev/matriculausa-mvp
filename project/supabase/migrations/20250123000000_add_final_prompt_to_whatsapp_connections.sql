-- Adiciona coluna final_prompt à tabela whatsapp_connections
ALTER TABLE whatsapp_connections
ADD COLUMN final_prompt TEXT;

-- Adiciona índice para melhorar performance de buscas por final_prompt
CREATE INDEX idx_whatsapp_connections_final_prompt ON whatsapp_connections(final_prompt);

-- Adiciona comentário para documentar a coluna
COMMENT ON COLUMN whatsapp_connections.final_prompt IS 'O prompt final completo do agente AI associado a esta conexão WhatsApp';
