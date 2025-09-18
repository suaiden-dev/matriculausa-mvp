import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Iniciando servidores de desenvolvimento...\n');

// Iniciar servidor Express (API)
console.log('📡 Iniciando servidor Express na porta 3001...');
const expressServer = spawn('node', ['server-email-api.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

// Aguardar um pouco para o Express iniciar
setTimeout(() => {
  console.log('\n🌐 Iniciando servidor Vite na porta 5173...');
  
  // Iniciar servidor Vite
  const viteServer = spawn('npm', ['run', 'dev'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });

  // Gerenciar encerramento dos processos
  process.on('SIGINT', () => {
    console.log('\n🛑 Encerrando servidores...');
    expressServer.kill();
    viteServer.kill();
    process.exit(0);
  });

}, 2000);

expressServer.on('error', (err) => {
  console.error('❌ Erro no servidor Express:', err);
});

viteServer.on('error', (err) => {
  console.error('❌ Erro no servidor Vite:', err);
});
