-- 🚨 PARAR CRON JOB IMEDIATAMENTE
-- Execute este SQL para parar o processamento automático

-- 1. Desativar cron job
SELECT cron.unschedule('email-processing');

-- 2. Verificar se foi desativado
SELECT * FROM cron.job WHERE jobname = 'email-processing';

-- 3. Verificar logs recentes
SELECT * FROM cron.job_run_details 
WHERE jobname = 'email-processing' 
ORDER BY start_time DESC LIMIT 5;

-- 4. Desativar configurações de email temporariamente
UPDATE email_configurations 
SET is_active = false 
WHERE provider_type = 'microsoft' 
AND user_id = '5682bded-cdbb-4f5e-afcc-bf2a2d8fdd27';

-- 5. Verificar se foi desativado
SELECT user_id, email_address, is_active, provider_type
FROM email_configurations 
WHERE provider_type = 'microsoft';

-- 📋 RESULTADO ESPERADO:
-- - Cron job desativado
-- - Configurações de email desativadas
-- - Processamento automático parado
-- - Sistema seguro para correções
