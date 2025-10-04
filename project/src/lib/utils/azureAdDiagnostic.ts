/**
 * Utilitário para diagnosticar problemas de configuração Azure AD
 * Baseado na solução do CodeMonday para erro AADSTS9002326
 * https://www.codemonday.com/blogs/aadsts9002326-cross-origin-token-redemption-is-permitted-only-for-the-single-page-application-client-type-request-origin-http-localhost-3000
 */

export interface AzureAdDiagnosticResult {
  issue: string;
  solution: string;
  severity: 'low' | 'medium' | 'high';
  action: string;
}

/**
 * Diagnostica problemas de configuração Azure AD
 */
export const diagnoseAzureAdConfiguration = (): AzureAdDiagnosticResult[] => {
  const results: AzureAdDiagnosticResult[] = [];
  
  // Verificar se há client_secret configurado
  const hasClientSecret = !!import.meta.env.VITE_AZURE_CLIENT_SECRET;
  const currentOrigin = window.location.origin;
  
  // Diagnóstico 1: Verificar configuração de tipos de aplicação
  if (hasClientSecret) {
    results.push({
      issue: 'Aplicação configurada como Web App com client_secret',
      solution: 'Certifique-se de que no Azure AD Portal, a URL de redirecionamento está configurada apenas como "Web" e não como "Single-page application"',
      severity: 'high',
      action: 'Verificar no Azure AD Portal se não há URLs duplicadas entre Web e SPA'
    });
  } else {
    results.push({
      issue: 'Aplicação configurada como SPA sem client_secret',
      solution: 'Certifique-se de que no Azure AD Portal, a URL de redirecionamento está configurada apenas como "Single-page application"',
      severity: 'high',
      action: 'Verificar no Azure AD Portal se não há URLs duplicadas entre Web e SPA'
    });
  }
  
  // Diagnóstico 2: Verificar origem da requisição
  if (currentOrigin.includes('localhost')) {
    results.push({
      issue: `Origem da requisição: ${currentOrigin}`,
      solution: 'Certifique-se de que esta URL está configurada apenas em UM tipo de aplicação no Azure AD',
      severity: 'medium',
      action: 'Verificar se localhost não está duplicado entre Web e SPA no Azure AD'
    });
  }
  
  // Diagnóstico 3: Verificar se há conflito de tipos
  results.push({
    issue: 'Possível conflito entre tipos de aplicação',
    solution: 'No Azure AD Portal, verifique se a mesma URL não está configurada em múltiplos tipos de aplicação',
    severity: 'high',
    action: 'Remover URLs duplicadas entre Web e SPA no Azure AD Portal'
  });
  
  return results;
};

/**
 * Gera instruções específicas para resolver o problema
 */
export const generateResolutionInstructions = (): string[] => {
  const currentOrigin = window.location.origin;
  
  return [
    '🔧 **Passos para Resolver o Erro AADSTS9002326:**',
    '',
    '1. **Acesse o Azure AD Portal:**',
    '   - Vá para https://portal.azure.com',
    '   - Navegue para "Azure Active Directory" > "App registrations"',
    '   - Encontre sua aplicação',
    '',
    '2. **Verifique as URLs de Redirecionamento:**',
    '   - Clique em "Authentication" no menu lateral',
    '   - Verifique se há URLs duplicadas entre diferentes tipos',
    '',
    '3. **Remova URLs Duplicadas:**',
    `   - Se ${currentOrigin} aparecer em "Web" E "Single-page application"`,
    '   - Remova a duplicata, mantendo apenas no tipo correto',
    '',
    '4. **Configure o Tipo Correto:**',
    '   - Se você tem client_secret: mantenha apenas em "Web"',
    '   - Se você NÃO tem client_secret: mantenha apenas em "Single-page application"',
    '',
    '5. **Salve as Alterações:**',
    '   - Clique em "Save"',
    '   - Aguarde alguns minutos para propagação',
    '',
    '6. **Teste Novamente:**',
    '   - Limpe o cache do navegador',
    '   - Tente fazer login novamente'
  ];
};

/**
 * Verifica se o erro atual é AADSTS9002326
 */
export const isAADSTS9002326Error = (error: any): boolean => {
  if (!error) return false;
  
  const errorMessage = error.message || error.error_description || error.toString();
  return errorMessage.includes('AADSTS9002326') || 
         errorMessage.includes('Cross-origin token redemption') ||
         errorMessage.includes('Single-Page Application client-type');
};

/**
 * Gera mensagem de erro específica para AADSTS9002326
 */
export const generateAADSTS9002326Message = (): string => {
  return `
🚨 **Erro AADSTS9002326 Detectado**

**Problema:** URLs duplicadas no Azure AD Portal entre diferentes tipos de aplicação.

**Solução Baseada no CodeMonday:**
https://www.codemonday.com/blogs/aadsts9002326-cross-origin-token-redemption-is-permitted-only-for-the-single-page-application-client-type-request-origin-http-localhost-3000

**Ação Necessária:**
1. Acesse o Azure AD Portal
2. Vá para sua aplicação > Authentication
3. Remova URLs duplicadas entre "Web" e "Single-page application"
4. Mantenha apenas no tipo correto para sua configuração

**Configuração Atual:**
- Client Secret: ${import.meta.env.VITE_AZURE_CLIENT_SECRET ? 'Configurado' : 'Não configurado'}
- Tipo Recomendado: ${import.meta.env.VITE_AZURE_CLIENT_SECRET ? 'Web' : 'Single-page application'}
  `.trim();
};
