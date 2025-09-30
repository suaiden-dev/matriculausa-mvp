-- 🧹 SCRIPT PARA LIMPAR LOCKS ÓRFÃOS
-- Execute este script se o sistema de lock estiver travado

-- 1. Ver locks ativos
SELECT 
  id,
  lock_key,
  is_active,
  created_at,
  EXTRACT(EPOCH FROM (now() - created_at)) as age_seconds
FROM worker_locks 
WHERE is_active = true
ORDER BY created_at DESC;

-- 2. Remover locks mais antigos que 5 minutos
DELETE FROM worker_locks 
WHERE is_active = true 
AND created_at < now() - interval '5 minutes';

-- 3. Verificar se foi limpo
SELECT COUNT(*) as remaining_locks 
FROM worker_locks 
WHERE is_active = true;
