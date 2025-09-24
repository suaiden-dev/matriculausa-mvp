// Script para carregar variáveis de ambiente do arquivo .env
import fs from 'fs';
import path from 'path';

export function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    const envVars = {};
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    
    // Carregar variáveis no process.env
    Object.assign(process.env, envVars);
    
    console.log('✅ Variáveis de ambiente carregadas do arquivo .env');
    return true;
  } catch (error) {
    console.error('❌ Erro ao carregar arquivo .env:', error.message);
    return false;
  }
}
