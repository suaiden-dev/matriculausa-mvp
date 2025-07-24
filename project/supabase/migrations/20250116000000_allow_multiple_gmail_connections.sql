-- Remove a constraint única que impede múltiplas conexões Gmail por usuário
-- Isso permite que um usuário conecte múltiplas contas Gmail

-- Primeiro, vamos verificar se a constraint existe
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'email_connections_user_id_provider_key'
    ) THEN
        -- Remove a constraint única
        ALTER TABLE email_connections 
        DROP CONSTRAINT email_connections_user_id_provider_key;
        
        RAISE NOTICE 'Constraint email_connections_user_id_provider_key removida com sucesso';
    ELSE
        RAISE NOTICE 'Constraint email_connections_user_id_provider_key não encontrada';
    END IF;
END $$;

-- Adiciona uma nova constraint única que inclui o email
-- Isso permite múltiplas conexões do mesmo provider, mas não duplicatas do mesmo email
ALTER TABLE email_connections 
ADD CONSTRAINT email_connections_user_id_provider_email_key 
UNIQUE (user_id, provider, email);

-- Comentário explicativo
COMMENT ON CONSTRAINT email_connections_user_id_provider_email_key ON email_connections 
IS 'Permite múltiplas conexões do mesmo provider (ex: múltiplas contas Gmail), mas não duplicatas do mesmo email'; 