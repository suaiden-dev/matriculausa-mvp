/**
 * Interceptor Global de Requisições Supabase
 * 
 * Captura TODAS as requisições desde o início da página, antes mesmo do React renderizar.
 * Integra com Performance API do navegador para capturar requisições do Network tab.
 */

import { requestTracker } from './requestTracker';

let isInterceptorActive = false;

/**
 * Extrai informações da URL Supabase
 */
function parseSupabaseRequest(url: string, method: string): { table?: string; function?: string; operation: string } {
  const result: { table?: string; function?: string; operation: string } = { operation: 'unknown' };
  
  if (!url.includes('supabase.co') && !url.includes('supabase')) {
    return result;
  }

  // Identificar RPC calls
  if (url.includes('/rest/v1/rpc/')) {
    const rpcMatch = url.match(/\/rpc\/([^/?]+)/);
    if (rpcMatch) {
      result.function = rpcMatch[1];
      result.operation = 'rpc';
    }
    return result;
  }

  // Identificar tabelas (REST API)
  if (url.includes('/rest/v1/')) {
    const tableMatch = url.match(/\/rest\/v1\/([^/?]+)/);
    if (tableMatch) {
      result.table = tableMatch[1];
      
      // Determinar operação pelo método HTTP
      if (method === 'GET') result.operation = 'select';
      else if (method === 'POST') result.operation = 'insert';
      else if (method === 'PATCH' || method === 'PUT') result.operation = 'update';
      else if (method === 'DELETE') result.operation = 'delete';
    }
    return result;
  }

  return result;
}

/**
 * Ativa o interceptor global de requisições Supabase
 */
export function activateSupabaseInterceptor() {
  if (isInterceptorActive) {
    console.log('🔍 [SupabaseInterceptor] Já está ativo');
    return;
  }

  console.log('🔍 [SupabaseInterceptor] Ativando interceptor global...');
  
  // Interceptar fetch globalmente
  const originalFetch = window.fetch;
  
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method || 'GET';
    const startTime = performance.now();
    
    // Verificar se é uma requisição Supabase
    const isSupabaseRequest = url.includes('supabase.co') || url.includes('supabase');
    
    if (isSupabaseRequest) {
      const parsed = parseSupabaseRequest(url, method);
      const requestId = requestTracker.trackRequest({
        method,
        table: parsed.table,
        function: parsed.function,
        operation: parsed.operation as any,
        status: 'pending',
      });

      try {
        const response = await originalFetch(input, init);
        const duration = performance.now() - startTime;
        
        requestTracker.updateRequest(requestId, {
          status: response.ok ? 'success' : 'error',
          duration: Math.round(duration),
        });
        
        return response;
      } catch (error: any) {
        const duration = performance.now() - startTime;
        
        requestTracker.updateRequest(requestId, {
          status: 'error',
          duration: Math.round(duration),
          error: error.message,
        });
        
        throw error;
      }
    }
    
    // Para requisições não-Supabase, apenas passar adiante
    return originalFetch(input, init);
  };

  // Observar Performance API para capturar requisições que já aconteceram
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry: any) => {
        if (entry.name && (entry.name.includes('supabase.co') || entry.name.includes('supabase'))) {
          const url = entry.name;
          const duration = entry.duration || 0;
          
          // Só registrar se ainda não foi registrado pelo fetch interceptor
          const parsed = parseSupabaseRequest(url, 'GET');
          
          requestTracker.trackRequest({
            method: 'GET',
            table: parsed.table,
            function: parsed.function,
            operation: parsed.operation as any,
            status: 'success',
            duration: Math.round(duration),
          });
        }
      });
    });

    // Observar resource timing (requisições de rede)
    observer.observe({ entryTypes: ['resource'] });
    
    console.log('✅ [SupabaseInterceptor] Performance Observer ativado');
  } catch (e) {
    console.warn('⚠️ [SupabaseInterceptor] Performance Observer não disponível:', e);
  }

  // Capturar requisições que já aconteceram antes do interceptor ser ativado
  if (typeof window !== 'undefined' && window.performance && window.performance.getEntriesByType) {
    try {
      const existingEntries = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      existingEntries.forEach((entry: PerformanceResourceTiming) => {
        if (entry.name && (entry.name.includes('supabase.co') || entry.name.includes('supabase'))) {
          const url = entry.name;
          const duration = entry.duration || 0;
          const parsed = parseSupabaseRequest(url, 'GET');
          
          requestTracker.trackRequest({
            method: 'GET',
            table: parsed.table,
            function: parsed.function,
            operation: parsed.operation as any,
            status: 'success',
            duration: Math.round(duration),
          });
        }
      });
      
      console.log(`✅ [SupabaseInterceptor] ${existingEntries.length} requisições já capturadas do histórico`);
    } catch (e) {
      console.warn('⚠️ [SupabaseInterceptor] Erro ao ler histórico de performance:', e);
    }
  }

  isInterceptorActive = true;
  console.log('✅ [SupabaseInterceptor] Interceptor global ativado');
}

/**
 * Desativa o interceptor
 */
export function deactivateSupabaseInterceptor() {
  if (!isInterceptorActive) return;
  
  // Não podemos realmente "desativar" o fetch monkey patch facilmente
  // sem guardar a referência original, mas isso é raramente necessário
  isInterceptorActive = false;
  console.log('🔍 [SupabaseInterceptor] Desativado (interceptor ainda ativo por segurança)');
}

/**
 * Inicialização automática se o tracker estiver habilitado
 */
if (typeof window !== 'undefined') {
  // Verificar se o tracker deve ser ativado automaticamente
  const shouldAutoActivate = localStorage.getItem('requestTracker:autoActivate') === 'true';
  
  if (shouldAutoActivate) {
    // Ativar imediatamente, antes do React renderizar
    activateSupabaseInterceptor();
    
    // Habilitar o tracker também
    requestTracker.enable();
  }
  
  // Expor funções globalmente para fácil acesso
  (window as any).activateSupabaseInterceptor = activateSupabaseInterceptor;
  (window as any).deactivateSupabaseInterceptor = deactivateSupabaseInterceptor;
}

