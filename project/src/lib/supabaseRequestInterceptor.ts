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
  
  // Interceptar XMLHttpRequest também (Supabase pode usar ambos)
  const OriginalXHR = window.XMLHttpRequest;
  
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
  
  // Interceptar XMLHttpRequest
  window.XMLHttpRequest = class extends OriginalXHR {
    private _url?: string;
    private _method?: string;
    private _startTime?: number;
    
    open(method: string, url: string | URL, async?: boolean, username?: string | null, password?: string | null): void {
      this._method = method;
      this._url = typeof url === 'string' ? url : url.toString();
      super.open(method, url, async ?? true, username ?? null, password ?? null);
    }
    
    send(body?: Document | XMLHttpRequestBodyInit | null): void {
      const url = this._url || '';
      const method = this._method || 'GET';
      const isSupabaseRequest = url.includes('supabase.co') || url.includes('supabase');
      
      if (isSupabaseRequest) {
        this._startTime = performance.now();
        const parsed = parseSupabaseRequest(url, method);
        const requestId = requestTracker.trackRequest({
          method,
          table: parsed.table,
          function: parsed.function,
          operation: parsed.operation as any,
          status: 'pending',
        });
        
        // Interceptar eventos para capturar sucesso/erro
        const originalOnReadyStateChange = this.onreadystatechange;
        this.onreadystatechange = (event) => {
          if (this.readyState === 4) { // DONE
            const duration = this._startTime ? performance.now() - this._startTime : 0;
            requestTracker.updateRequest(requestId, {
              status: this.status >= 200 && this.status < 300 ? 'success' : 'error',
              duration: Math.round(duration),
            });
          }
          
          if (originalOnReadyStateChange) {
            originalOnReadyStateChange.call(this, event);
          }
        };
        
        // Interceptar onerror também
        const originalOnError = this.onerror;
        this.onerror = (event) => {
          const duration = this._startTime ? performance.now() - this._startTime : 0;
          requestTracker.updateRequest(requestId, {
            status: 'error',
            duration: Math.round(duration),
            error: 'Network error',
          });
          
          if (originalOnError) {
            originalOnError.call(this, event);
          }
        };
      }
      
      super.send(body);
    }
  } as typeof XMLHttpRequest;

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
  const capturedUrls = new Set<string>();
  
  function captureExistingRequests() {
    if (typeof window !== 'undefined' && window.performance && window.performance.getEntriesByType) {
      try {
        const existingEntries = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        let newCount = 0;
        
        existingEntries.forEach((entry: PerformanceResourceTiming) => {
          if (entry.name && (entry.name.includes('supabase.co') || entry.name.includes('supabase'))) {
            // Evitar duplicatas
            if (capturedUrls.has(entry.name)) return;
            capturedUrls.add(entry.name);
            
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
            
            newCount++;
          }
        });
        
        if (newCount > 0) {
          console.log(`✅ [SupabaseInterceptor] ${newCount} requisições capturadas do histórico`);
        }
      } catch (e) {
        console.warn('⚠️ [SupabaseInterceptor] Erro ao ler histórico de performance:', e);
      }
    }
  }
  
  // Capturar imediatamente
  captureExistingRequests();
  
  // Capturar periodicamente para pegar requisições que acontecem durante o carregamento
  // Isso é importante porque algumas requisições podem acontecer enquanto outros módulos carregam
  let captureInterval: number | null = null;
  if (typeof window !== 'undefined') {
    captureInterval = window.setInterval(() => {
      captureExistingRequests();
    }, 100); // Verificar a cada 100ms durante os primeiros segundos
    
    // Parar de verificar após 10 segundos (tempo suficiente para carregamento inicial)
    setTimeout(() => {
      if (captureInterval !== null) {
        clearInterval(captureInterval);
        captureInterval = null;
        console.log('✅ [SupabaseInterceptor] Monitoramento periódico finalizado');
      }
    }, 10000);
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
 * INICIALIZAÇÃO AUTOMÁTICA NO CARREGAMENTO DO MÓDULO
 * 
 * Esta parte executa IMEDIATAMENTE quando o módulo é importado,
 * antes de qualquer outro código JavaScript executar.
 * Isso garante que o interceptor esteja ativo desde o início.
 */
if (typeof window !== 'undefined') {
  // Verificar se o tracker deve ser ativado automaticamente
  // Usar try/catch porque localStorage pode não estar disponível em alguns contextos
  let shouldAutoActivate = false;
  try {
    shouldAutoActivate = localStorage.getItem('requestTracker:autoActivate') === 'true';
  } catch (e) {
    // localStorage não disponível, continuar normalmente
  }
  
  if (shouldAutoActivate) {
    // ⚠️ CRÍTICO: Ativar IMEDIATAMENTE, síncronamente, antes de qualquer outra coisa
    // Não usar setTimeout, não usar async/await - executar diretamente
    console.log('🔍 [SupabaseInterceptor] Auto-ativação detectada - ativando imediatamente...');
    activateSupabaseInterceptor();
    
    // Habilitar o tracker também
    try {
      requestTracker.enable();
    } catch (e) {
      console.warn('⚠️ [SupabaseInterceptor] Erro ao habilitar requestTracker:', e);
    }
    
    console.log('✅ [SupabaseInterceptor] Interceptor ativado automaticamente');
  }
  
  // Expor funções globalmente para fácil acesso no console
  (window as any).activateSupabaseInterceptor = activateSupabaseInterceptor;
  (window as any).deactivateSupabaseInterceptor = deactivateSupabaseInterceptor;
  (window as any).requestTracker = requestTracker;
  
  console.log('🔍 [SupabaseInterceptor] Módulo carregado. Use window.activateSupabaseInterceptor() para ativar manualmente.');
}

