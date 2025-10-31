/**
 * Request Tracker - Mapeia todas as requisições Supabase para análise de performance
 * 
 * Uso: Habilitar apenas em desenvolvimento para identificar problemas N+1
 */

interface TrackedRequest {
  id: string;
  timestamp: number;
  method: string;
  table?: string;
  function?: string;
  operation: 'select' | 'insert' | 'update' | 'delete' | 'rpc' | 'unknown';
  duration?: number;
  status?: 'pending' | 'success' | 'error';
  userCount?: number; // Para identificar batch vs individual
  error?: any;
}

class RequestTracker {
  private requests: TrackedRequest[] = [];
  private isEnabled: boolean = false;
  private startTime: number = 0;

  enable() {
    if (this.isEnabled) return;
    this.isEnabled = true;
    this.startTime = Date.now();
    this.requests = [];
    console.log('🔍 [RequestTracker] Habilitado - Todas as requisições serão mapeadas');
  }

  disable() {
    this.isEnabled = false;
  }

  trackRequest(request: Omit<TrackedRequest, 'id' | 'timestamp'>): string {
    if (!this.isEnabled) return '';
    
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tracked: TrackedRequest = {
      id,
      timestamp: Date.now() - this.startTime,
      ...request,
    };
    
    this.requests.push(tracked);
    return id;
  }

  updateRequest(id: string, updates: Partial<TrackedRequest>) {
    if (!this.isEnabled) return;
    const index = this.requests.findIndex(r => r.id === id);
    if (index >= 0) {
      this.requests[index] = { ...this.requests[index], ...updates };
    }
  }

  getReport() {
    if (!this.isEnabled || this.requests.length === 0) {
      return { summary: 'Tracker não habilitado ou sem requisições', requests: [] };
    }

    // Agrupar por tipo de operação
    const byOperation: Record<string, TrackedRequest[]> = {};
    const byTable: Record<string, TrackedRequest[]> = {};
    const byFunction: Record<string, TrackedRequest[]> = {};

    this.requests.forEach(req => {
      // Por operação
      const op = req.operation || 'unknown';
      if (!byOperation[op]) byOperation[op] = [];
      byOperation[op].push(req);

      // Por tabela
      if (req.table) {
        if (!byTable[req.table]) byTable[req.table] = [];
        byTable[req.table].push(req);
      }

      // Por função RPC
      if (req.function) {
        if (!byFunction[req.function]) byFunction[req.function] = [];
        byFunction[req.function].push(req);
      }
    });

    // Identificar padrões problemáticos
    const nPlusOnePatterns: string[] = [];
    
    // Padrão: muitas chamadas para a mesma função RPC com diferentes user_ids
    Object.entries(byFunction).forEach(([funcName, reqs]) => {
      if (reqs.length > 10) {
        const individualCalls = reqs.filter(r => !r.userCount || r.userCount === 1);
        if (individualCalls.length > 10) {
          nPlusOnePatterns.push(
            `⚠️ N+1 detectado: ${individualCalls.length} chamadas individuais para ${funcName}`
          );
        }
      }
    });

    // Padrão: muitas chamadas para a mesma tabela sem batch
    Object.entries(byTable).forEach(([tableName, reqs]) => {
      if (reqs.length > 50) {
        const individualCalls = reqs.filter(r => r.operation === 'select' && (!r.userCount || r.userCount === 1));
        if (individualCalls.length > 50) {
          nPlusOnePatterns.push(
            `⚠️ N+1 detectado: ${individualCalls.length} chamadas individuais para tabela ${tableName}`
          );
        }
      }
    });

    return {
      summary: {
        totalRequests: this.requests.length,
        totalTime: this.requests[this.requests.length - 1]?.timestamp || 0,
        byOperation: Object.fromEntries(
          Object.entries(byOperation).map(([op, reqs]) => [op, reqs.length])
        ),
        byTable: Object.fromEntries(
          Object.entries(byTable).map(([table, reqs]) => [table, reqs.length])
        ),
        byFunction: Object.fromEntries(
          Object.entries(byFunction).map(([func, reqs]) => [func, reqs.length])
        ),
        nPlusOnePatterns,
      },
      requests: this.requests,
      topSlowRequests: this.requests
        .filter(r => r.duration && r.duration > 200)
        .sort((a, b) => (b.duration || 0) - (a.duration || 0))
        .slice(0, 20),
    };
  }

  exportReport() {
    const report = this.getReport();
    const reportStr = JSON.stringify(report, null, 2);
    
    // Criar arquivo para download
    const blob = new Blob([reportStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-management-requests-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Também logar no console
    console.group('📊 [RequestTracker] Relatório Completo');
    console.log('📋 Resumo:', report.summary);
    console.log('🐌 Requisições Lentas (>200ms):', report.topSlowRequests);
    if (report.summary.nPlusOnePatterns.length > 0) {
      console.group('⚠️ Padrões N+1 Detectados:');
      report.summary.nPlusOnePatterns.forEach(p => console.warn(p));
      console.groupEnd();
    }
    console.log('📥 Relatório completo exportado como JSON');
    console.groupEnd();
    
    return report;
  }

  clear() {
    this.requests = [];
    this.startTime = Date.now();
  }
}

export const requestTracker = new RequestTracker();

// Adicionar ao window para acesso via console
if (typeof window !== 'undefined') {
  (window as any).requestTracker = requestTracker;
}

