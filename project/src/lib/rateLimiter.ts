/**
 * Rate Limiter para Microsoft Graph API
 * Controla a frequência das requisições para evitar rate limiting (429)
 */

interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxConcurrentRequests: number;
  retryDelayMs: number;
  backoffMultiplier: number;
  maxRetries: number;
}

export class RateLimiter {
  private requestQueue: Array<() => Promise<any>> = [];
  private activeRequests: number = 0;
  private requestTimes: number[] = [];
  private config: RateLimitConfig;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      maxRequestsPerMinute: 60, // Microsoft Graph permite 60 req/min
      maxConcurrentRequests: 3, // Máximo 3 requisições simultâneas
      retryDelayMs: 1000, // 1 segundo de delay inicial
      backoffMultiplier: 2, // Dobrar o delay a cada retry
      maxRetries: 3,
      ...config
    };
  }

  /**
   * Adiciona uma requisição à fila com rate limiting
   */
  async executeRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }

  /**
   * Processa a fila de requisições respeitando os limites
   */
  private async processQueue(): Promise<void> {
    if (this.activeRequests >= this.config.maxConcurrentRequests) {
      return; // Aguardar requisições ativas terminarem
    }

    if (this.requestQueue.length === 0) {
      return; // Fila vazia
    }

    // Verificar rate limit por minuto
    if (!this.canMakeRequest()) {
      const delay = this.calculateDelay();
      console.log(`⏳ RateLimiter - Aguardando ${delay}ms para respeitar rate limit`);
      setTimeout(() => this.processQueue(), delay);
      return;
    }

    const request = this.requestQueue.shift();
    if (!request) return;

    this.activeRequests++;
    this.requestTimes.push(Date.now());

    try {
      await request();
    } catch (error) {
      console.error('❌ RateLimiter - Erro na requisição:', error);
      
      // Implementar retry com backoff exponencial
      if (this.shouldRetry(error)) {
        await this.handleRetry(request);
      }
    } finally {
      this.activeRequests--;
      this.processQueue(); // Processar próxima requisição
    }
  }

  /**
   * Verifica se pode fazer uma nova requisição
   */
  private canMakeRequest(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remover requisições antigas (mais de 1 minuto)
    this.requestTimes = this.requestTimes.filter(time => time > oneMinuteAgo);
    
    return this.requestTimes.length < this.config.maxRequestsPerMinute;
  }

  /**
   * Calcula o delay necessário para respeitar o rate limit
   */
  private calculateDelay(): number {
    if (this.requestTimes.length === 0) return 0;
    
    const oldestRequest = Math.min(...this.requestTimes);
    const timeSinceOldest = Date.now() - oldestRequest;
    const remainingTime = 60000 - timeSinceOldest;
    
    return Math.max(remainingTime, 1000); // Mínimo 1 segundo
  }

  /**
   * Verifica se deve tentar novamente após erro
   */
  private shouldRetry(error: any): boolean {
    if (error?.status === 429) {
      return true; // Rate limit - sempre tentar novamente
    }
    
    if (error?.status >= 500) {
      return true; // Erro do servidor - tentar novamente
    }
    
    return false; // Outros erros - não tentar novamente
  }

  /**
   * Implementa retry com backoff exponencial
   */
  private async handleRetry(request: () => Promise<any>): Promise<void> {
    let retryCount = 0;
    let delay = this.config.retryDelayMs;

    while (retryCount < this.config.maxRetries) {
      retryCount++;
      console.log(`🔄 RateLimiter - Tentativa ${retryCount}/${this.config.maxRetries} em ${delay}ms`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      try {
        await request();
        console.log(`✅ RateLimiter - Retry bem-sucedido na tentativa ${retryCount}`);
        return;
      } catch (error) {
        console.error(`❌ RateLimiter - Retry ${retryCount} falhou:`, error);
        
        if (retryCount < this.config.maxRetries) {
          delay *= this.config.backoffMultiplier;
        }
      }
    }
    
    console.error(`❌ RateLimiter - Todas as tentativas falharam após ${this.config.maxRetries} retries`);
  }

  /**
   * Obtém estatísticas do rate limiter
   */
  getStats() {
    return {
      queueLength: this.requestQueue.length,
      activeRequests: this.activeRequests,
      requestsLastMinute: this.requestTimes.length,
      config: this.config
    };
  }

  /**
   * Limpa a fila e reseta o estado
   */
  clear() {
    this.requestQueue = [];
    this.activeRequests = 0;
    this.requestTimes = [];
    console.log('🧹 RateLimiter - Fila limpa e estado resetado');
  }
}

// Instância global do rate limiter
export const rateLimiter = new RateLimiter({
  maxRequestsPerMinute: 30, // Mais conservador para evitar 429
  maxConcurrentRequests: 2, // Apenas 2 requisições simultâneas
  retryDelayMs: 2000, // 2 segundos de delay inicial
  backoffMultiplier: 1.5, // Backoff mais suave
  maxRetries: 3
});

export default rateLimiter;
