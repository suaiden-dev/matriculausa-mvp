-- Migração para reverter os campos Zelle da tabela user_profiles
-- Data: 2025-01-23

-- 1. Remover as políticas RLS relacionadas ao Zelle
DROP POLICY IF EXISTS "Users can view their own Zelle payment data" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all Zelle payment data" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update Zelle payment status" ON user_profiles;

-- 2. Remover as funções relacionadas ao Zelle
DROP FUNCTION IF EXISTS update_zelle_payment_status(uuid, text, text, uuid);
DROP FUNCTION IF EXISTS get_pending_zelle_payments();

-- 3. Remover os índices relacionados ao Zelle
DROP INDEX IF EXISTS idx_user_profiles_zelle_status;
DROP INDEX IF EXISTS idx_user_profiles_payment_method;

-- 4. Remover as colunas Zelle da tabela user_profiles
ALTER TABLE user_profiles
DROP COLUMN IF EXISTS payment_method,
DROP COLUMN IF EXISTS payment_proof_url,
DROP COLUMN IF EXISTS admin_notes,
DROP COLUMN IF EXISTS zelle_status,
DROP COLUMN IF EXISTS reviewed_by,
DROP COLUMN IF EXISTS reviewed_at;

-- 5. Verificar se a reversão foi bem-sucedida
-- A tabela deve estar no estado anterior à migração do Zelle
