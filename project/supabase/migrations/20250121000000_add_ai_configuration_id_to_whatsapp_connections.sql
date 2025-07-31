-- Adiciona coluna ai_configuration_id à tabela whatsapp_connections
ALTER TABLE whatsapp_connections
ADD COLUMN ai_configuration_id UUID REFERENCES ai_configurations(id);

-- Adiciona índice para melhorar performance de buscas por ai_configuration_id
CREATE INDEX idx_whatsapp_connections_ai_configuration_id ON whatsapp_connections(ai_configuration_id);

-- Adiciona coluna ai_configuration_id à tabela chatwoot_accounts
ALTER TABLE chatwoot_accounts
ADD COLUMN ai_configuration_id UUID REFERENCES ai_configurations(id);