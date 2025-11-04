/**
 * Request Cache (Client-side)
 * 
 * Sistema de cache em memória para reduzir requisições duplicadas.
 * Armazena respostas de RPC e queries com TTL configurável.
 */

interface CachedItem<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live em milissegundos
}

class RequestCache {
  private cache: Map<string, CachedItem> = new Map();
  
  /**
   * TTLs padrão por tipo de dado
   */
  private readonly DEFAULT_TTL = {
    feeOverrides: 5 * 60 * 1000, // 5 minutos - dados raramente mudam
    userProfiles: 2 * 60 * 1000, // 2 minutos
    notifications: 30 * 1000, // 30 segundos - dados mudam mais frequentemente
    paymentDates: 2 * 60 * 1000, // 2 minutos
    universities: 10 * 60 * 1000, // 10 minutos - dados muito estáveis
    scholarships: 5 * 60 * 1000, // 5 minutos
  };

  /**
   * Gera chave de cache baseada em função e parâmetros
   */
  private generateKey(functionName: string, params?: any): string {
    if (!params) {
      return functionName;
    }
    
    // Serializa parâmetros de forma determinística
    const paramStr = typeof params === 'object' 
      ? JSON.stringify(params, Object.keys(params).sort())
      : String(params);
    
    return `${functionName}:${paramStr}`;
  }

  /**
   * Verifica se um item está em cache e ainda válido
   */
  get<T = any>(functionName: string, params?: any): T | null {
    const key = this.generateKey(functionName, params);
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }
    
    const now = Date.now();
    const age = now - cached.timestamp;
    
    // Verifica se expirou
    if (age > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  /**
   * Armazena item no cache com TTL
   */
  set<T = any>(functionName: string, data: T, params?: any, customTtl?: number): void {
    const key = this.generateKey(functionName, params);
    
    // Determina TTL baseado no tipo de função ou usa custom
    let ttl = customTtl;
    if (!ttl) {
      if (functionName.includes('fee_overrides') || functionName.includes('get_user_fee_overrides')) {
        ttl = this.DEFAULT_TTL.feeOverrides;
      } else if (functionName.includes('notification') || functionName.includes('unread')) {
        ttl = this.DEFAULT_TTL.notifications;
      } else if (functionName.includes('user_profiles') || functionName.includes('user_profile')) {
        ttl = this.DEFAULT_TTL.userProfiles;
      } else if (functionName.includes('payment_date') || functionName.includes('payment_dates')) {
        ttl = this.DEFAULT_TTL.paymentDates;
      } else if (functionName.includes('university') || functionName.includes('universities')) {
        ttl = this.DEFAULT_TTL.universities;
      } else if (functionName.includes('scholarship') || functionName.includes('scholarships')) {
        ttl = this.DEFAULT_TTL.scholarships;
      } else {
        ttl = 2 * 60 * 1000; // Default 2 minutos
      }
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Invalida cache específico
   */
  invalidate(functionName: string, params?: any): void {
    const key = this.generateKey(functionName, params);
    this.cache.delete(key);
  }

  /**
   * Invalida todos os caches de uma função (independente de parâmetros)
   */
  invalidateAll(functionName: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${functionName}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove itens expirados do cache
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, item] of this.cache.entries()) {
      const age = now - item.timestamp;
      if (age > item.ttl) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Retorna estatísticas do cache
   */
  getStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

// Instância singleton
export const requestCache = new RequestCache();

// Limpeza automática a cada 1 minuto
if (typeof window !== 'undefined') {
  setInterval(() => {
    requestCache.cleanup();
  }, 60 * 1000);
}

