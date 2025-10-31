/**
 * Leitor de Requisições via Performance API
 * 
 * Abordagem simples e confiável: lê TODAS as requisições do histórico
 * do navegador usando Performance API. Não tenta interceptar, apenas lê
 * o que já aconteceu.
 */

interface NetworkRequest {
  url: string;
  method: string;
  duration: number;
  status: number;
  timestamp: number;
  table?: string;
  function?: string;
  operation: string;
}

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
 * Lê TODAS as requisições Supabase do histórico do navegador
 */
export function readAllSupabaseRequests(): NetworkRequest[] {
  const requests: NetworkRequest[] = [];
  
  if (typeof window === 'undefined' || !window.performance || !window.performance.getEntriesByType) {
    return requests;
  }

  try {
    // Ler TODAS as requisições de recurso (network requests)
    const entries = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    entries.forEach((entry: PerformanceResourceTiming) => {
      const url = entry.name;
      
      // Filtrar apenas requisições Supabase
      if (url.includes('supabase.co') || url.includes('supabase')) {
        // Tentar extrair método HTTP do initiatorType ou da URL
        // Performance API não expõe método HTTP diretamente, mas podemos inferir
        let method = 'GET'; // Default
        if (entry.initiatorType === 'xmlhttprequest' || entry.initiatorType === 'fetch') {
          // Para POST/PATCH/DELETE, geralmente há um body
          // Mas Performance API não expõe isso, então assumimos GET para REST API
          method = 'GET';
        }
        
        const parsed = parseSupabaseRequest(url, method);
        const duration = entry.duration || 0;
        
        // Tentar obter status HTTP (nem sempre disponível)
        let status = 200;
        if ('responseStatus' in entry) {
          status = (entry as any).responseStatus || 200;
        }
        
        // Timestamp relativo ao início da navegação
        const timestamp = entry.startTime || 0;
        
        requests.push({
          url,
          method,
          duration: Math.round(duration),
          status,
          timestamp: Math.round(timestamp),
          table: parsed.table,
          function: parsed.function,
          operation: parsed.operation,
        });
      }
    });
  } catch (e) {
    console.warn('⚠️ [PerformanceNetworkReader] Erro ao ler requisições:', e);
  }

  return requests;
}

/**
 * Converte requisições do Performance API para formato do RequestTracker
 */
export async function convertToTrackedRequests(requests: NetworkRequest[]) {
  const { requestTracker } = await import('./requestTracker');
  
  requests.forEach(req => {
    requestTracker.trackRequest({
      method: req.method,
      table: req.table,
      function: req.function,
      operation: req.operation as any,
      status: req.status >= 200 && req.status < 300 ? 'success' : 'error',
      duration: req.duration,
    });
  });
}

/**
 * Monitora novas requisições usando Performance API
 */
export function startMonitoringNewRequests() {
  if (typeof window === 'undefined') {
    return () => {}; // Return no-op function
  }

  let lastCount = 0;
  const capturedUrls = new Set<string>();
  let requestTrackerPromise: Promise<any> | null = null;
  
  // Importar tracker uma vez
  function getTracker() {
    if (!requestTrackerPromise) {
      requestTrackerPromise = import('./requestTracker').then(m => m.requestTracker);
    }
    return requestTrackerPromise;
  }
  
  async function checkForNewRequests() {
    const entries = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    // Só processar se houver novas entradas
    if (entries.length === lastCount) {
      return;
    }
    
    lastCount = entries.length;
    const tracker = await getTracker();
    
    for (const entry of entries) {
      const url = entry.name;
      
      if ((url.includes('supabase.co') || url.includes('supabase')) && !capturedUrls.has(url)) {
        capturedUrls.add(url);
        
        // Adicionar ao tracker
        const parsed = parseSupabaseRequest(url, 'GET');
        
        tracker.trackRequest({
          method: 'GET',
          table: parsed.table,
          function: parsed.function,
          operation: parsed.operation as any,
          status: 'success',
          duration: Math.round(entry.duration || 0),
        });
      }
    }
  }
  
  // Verificar imediatamente
  checkForNewRequests();
  
  // Verificar periodicamente (mais confiável que Performance Observer para capturar tudo)
  const interval = setInterval(checkForNewRequests, 100); // A cada 100ms
  
  // Retornar função para parar o monitoramento
  return () => {
    clearInterval(interval);
  };
}

