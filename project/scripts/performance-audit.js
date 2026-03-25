import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const results = [];

function checkFile(filePath, pattern, description) {
  const fullPath = path.join(projectRoot, filePath);
  if (!fs.existsSync(fullPath)) {
    results.push({ task: description, status: '🔴 ERRO', detail: `Arquivo ${filePath} não encontrado` });
    return;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  const match = content.match(pattern);
  results.push({ 
    task: description, 
    status: match ? '✅ OK' : '❌ FALHA', 
    detail: match ? `Padrão encontrado em ${filePath}` : `Padrão não encontrado em ${filePath}` 
  });
}

function countOccurrences(filePath, pattern, description, expected, comparison = 'equal') {
  const fullPath = path.join(projectRoot, filePath);
  if (!fs.existsSync(fullPath)) {
    results.push({ task: description, status: '🔴 ERRO', detail: `Arquivo ${filePath} não encontrado` });
    return;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  const occurrences = (content.match(pattern) || []).length;
  
  let success = false;
  if (comparison === 'equal') success = occurrences === expected;
  else if (comparison === 'lessOrEqual') success = occurrences <= expected;

  results.push({ 
    task: description, 
    status: success ? '✅ OK' : '❌ FALHA', 
    detail: `Encontradas ${occurrences} recorrências (esperado: ${expected})` 
  });
}

function checkFileAbsence(filePath, description) {
  const fullPath = path.join(projectRoot, filePath);
  const exists = fs.existsSync(fullPath);
  results.push({ 
    task: description, 
    status: !exists ? '✅ OK' : '❌ FALHA', 
    detail: exists ? `Arquivo ${filePath} ainda existe (deveria ter sido deletado)` : `Arquivo ${filePath} removido com sucesso` 
  });
}

console.log('\n🔍 Iniciando Auditoria de Performance - Admin Dashboard...\n');

// --- FASE 1: QUICK WINS ---

// TASK-01: Remover query duplicada get_admin_users_data
countOccurrences('src/pages/AdminDashboard/index.tsx', /get_admin_users_data/g, 'TASK-01: Query única get_admin_users_data', 1);

// TASK-02: Paralelizar loadAdminData
checkFile('src/pages/AdminDashboard/index.tsx', /Promise\.all\(\[/, 'TASK-02: Paralelização via Promise.all');

// TASK-03: Remover logs do Overview.tsx
countOccurrences('src/pages/AdminDashboard/Overview.tsx', /console\.log\(.*🔍 \[Overview\]/g, 'TASK-03: Sem logs de debug no Overview', 0);

// TASK-04: Remover debug log e memoizar shouldFilter()
countOccurrences('src/pages/AdminDashboard/PaymentManagement/data/loaders/paymentsLoaderOptimized.ts', /shouldFilter\(\)/g, 'TASK-04: Remoção de shouldFilter() redundante', 0);

// TASK-05: Remover logs do paymentConverter.ts
countOccurrences('src/utils/paymentConverter.ts', /console\.log/g, 'TASK-05: Limpeza de logs em loops (paymentConverter)', 1, 'lessOrEqual');

// --- FASE 2: LAZY LOADING ---

// TASK-06 & 07: Lazy Loading
checkFile('src/App.tsx', /lazy\(/, 'TASK-06: Lazy loading no roteamento principal (App.tsx)');
checkFile('src/pages/AdminDashboard/index.tsx', /lazy\(/, 'TASK-07: Lazy carregamento de sub-módulos Admin');

// --- FASE 3: CONSOLIDAR NOTIFICAÇÕES ---

// TASK-08: Limpeza Global de Logs
countOccurrences('src/hooks/useReferralCodeCapture.ts', /console\.log/g, 'TASK-08: Limpeza de logs globais', 0);

// TASK-09: Contexto de Notificações
checkFile('src/pages/AdminDashboard/AdminDashboardLayout.tsx', /AdminNotificationsContext|staleTime/, 'TASK-09: Cache de notificações (Context/Query)');

// --- FASE 4: OPTIMIZE PAYMENT MANAGEMENT ---

// TASK-10 & 11: Batching de Pagamentos
checkFile('src/utils/paymentConverter.ts', /getGrossPaidAmountsBatch/, 'TASK-10: Implementação do Batching (RPC única)');
checkFile('src/pages/AdminDashboard/PaymentManagement/hooks/usePaymentQueries.ts', /getGrossPaidAmountsBatch/, 'TASK-11: Uso do Batching no hook de queries');

// TASK-12: Promise.all em loaders de pagamentos
checkFile('src/pages/AdminDashboard/PaymentManagement/data/loaders/paymentsLoaderOptimized.ts', /Promise\.all\(/, 'TASK-12: Paralelização no loader de pagamentos');

// TASK-13: Redundância no zelleLoader
countOccurrences('src/pages/AdminDashboard/PaymentManagement/data/loaders/zelleLoader.ts', /supabase\..*select/g, 'TASK-13: Remoção de queries redundantes no Zelle', 2, 'lessOrEqual');

// --- FASE 5: LIMPEZA FINAL ---

// TASK-14 & 15: Remoção de arquivos legados ou temporários
checkFileAbsence('src/pages/AdminDashboard/AdminStudentDetails.tsx', 'TASK-14: Remoção do arquivo legacy AdminStudentDetails (326 KB)');
checkFileAbsence('src/pages/QuickRegistration.tsx.tmp', 'TASK-15: Remoção do arquivo temporário .tmp');

// EXIBIÇÃO DO RESULTADO
console.table(results);

const allOk = results.every(r => r.status === '✅ OK');
if (allOk) {
  console.log('\n🚀 PARABÉNS! Todas as tarefas de auditoria estática passaram.\n');
} else {
  console.log('\n⚠️ ATENÇÃO: Algumas tarefas falharam na auditoria. Verifique a tabela acima.\n');
}

// Gerar relatório markdown parcial
const reportBody = results.map(r => `| ${r.task} | ${r.status} | ${r.detail} |`).join('\n');
const reportHeader = '# Relatório de Auditoria de Performance\n\n| Task | Status | Detalhe |\n|---|---|---|\n';
fs.writeFileSync(path.join(projectRoot, 'docs/VERIFICACAO_PERFORMANCE_AUDIT.md'), reportHeader + reportBody);

console.log('📝 Relatório gerado em: docs/VERIFICACAO_PERFORMANCE_AUDIT.md\n');
