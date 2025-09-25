import EmailProcessor from './emailProcessor';

interface PollingConfig {
  intervalMinutes: number;
  maxRetries: number;
  retryDelayMs: number;
}

export class EmailPollingService {
  private processor: EmailProcessor;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private config: PollingConfig;
  private lastCheckTime: Date | null = null;
  private lastEmailTimestamp: Date | null = null; // Timestamp do último email processado
  private processedEmails: Set<string> = new Set();
  private consecutiveEmptyChecks: number = 0; // Contador de verificações vazias consecutivas
  private adaptiveInterval: number = 5; // 🚨 MODO CONSERVADOR: Intervalo adaptativo em minutos (era 2)
  private baseInterval: number = 5; // 🚨 MODO CONSERVADOR: Intervalo base em minutos (era 2)
  private maxInterval: number = 15; // 🚨 MODO CONSERVADOR: Intervalo máximo em minutos (era 10)

  constructor(accessToken: string, aiApiKey?: string, config?: Partial<PollingConfig>) {
    this.processor = new EmailProcessor(accessToken, aiApiKey);
    this.config = {
      intervalMinutes: 5, // 🚨 MODO CONSERVADOR: Verificar a cada 5 minutos (era 2)
      maxRetries: 3,
      retryDelayMs: 5000,
      ...config
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('🔄 EmailPollingService - Já está rodando');
      return;
    }

    console.log('🚀 EmailPollingService - Iniciando sistema de polling...');
    console.log(`🔄 EmailPollingService - Intervalo: ${this.config.intervalMinutes} minutos`);
    
    this.isRunning = true;
    this.lastCheckTime = new Date();

    // Executar imediatamente
    await this.checkForNewEmails();

    // Configurar intervalo
    this.intervalId = setInterval(async () => {
      await this.checkForNewEmails();
    }, this.config.intervalMinutes * 60 * 1000);

    console.log('✅ EmailPollingService - Sistema de polling iniciado');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('🔄 EmailPollingService - Já está parado');
      return;
    }

    console.log('⏹️ EmailPollingService - Parando sistema de polling...');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('✅ EmailPollingService - Sistema de polling parado');
  }

  private async checkForNewEmails(): Promise<void> {
    try {
      console.log('🔍 EmailPollingService - Verificando novos emails...');
      console.log(`🕐 EmailPollingService - Última verificação: ${this.lastCheckTime?.toISOString()}`);
      console.log(`📧 EmailPollingService - Último email processado: ${this.lastEmailTimestamp?.toISOString() || 'Nenhum'}`);
      
      // Usar detecção inteligente baseada em timestamp
      const processedEmails = await this.processor.processNewEmails(this.lastEmailTimestamp);
      
      // Filtrar emails já processados
      const newEmails = processedEmails.filter(email => !this.processedEmails.has(email.id));
      
      if (newEmails.length > 0) {
        console.log(`📧 EmailPollingService - ${newEmails.length} novos emails processados`);
        
        // Adicionar aos processados
        newEmails.forEach(email => {
          this.processedEmails.add(email.id);
        });

        // Atualizar timestamp do último email processado
        const latestEmail = newEmails.reduce((latest, current) => 
          current.processedAt > latest.processedAt ? current : latest
        );
        this.lastEmailTimestamp = latestEmail.processedAt;

        // Reset contador de verificações vazias
        this.consecutiveEmptyChecks = 0;

        // Log detalhado
        newEmails.forEach(email => {
          console.log(`📧 EmailPollingService - Email: ${email.subject} | Status: ${email.status} | Resposta: ${email.response ? 'Sim' : 'Não'} | Timestamp: ${email.processedAt.toISOString()}`);
        });
      } else {
        this.consecutiveEmptyChecks++;
        console.log(`📭 EmailPollingService - Nenhum email novo encontrado (verificação ${this.consecutiveEmptyChecks})`);
        
        // Implementar polling adaptativo
        this.adjustPollingInterval();
      }

      this.lastCheckTime = new Date();
      
    } catch (error) {
      console.error('❌ EmailPollingService - Erro ao verificar emails:', error);
      
      // Implementar retry logic se necessário
      await this.handleError(error);
    }
  }

  private adjustPollingInterval(): void {
    // Ajustar intervalo baseado na atividade
    if (this.consecutiveEmptyChecks >= 10) {
      // Aumentar intervalo gradualmente se muitas verificações vazias
      this.adaptiveInterval = Math.min(this.adaptiveInterval * 1.5, this.maxInterval);
      console.log(`⏰ EmailPollingService - Aumentando intervalo para ${this.adaptiveInterval} minutos`);
      
      // Reiniciar polling com novo intervalo
      this.restartPolling();
    } else if (this.consecutiveEmptyChecks === 0) {
      // Reset para intervalo base se encontrou emails
      this.adaptiveInterval = this.baseInterval;
      console.log(`⚡ EmailPollingService - Resetando para intervalo base: ${this.adaptiveInterval} minutos`);
      
      // Reiniciar polling com novo intervalo
      this.restartPolling();
    }
  }

  private restartPolling(): void {
    if (this.isRunning && this.intervalId) {
      clearInterval(this.intervalId);
      
      this.intervalId = setInterval(async () => {
        await this.checkForNewEmails();
      }, this.adaptiveInterval * 60 * 1000);
      
      console.log(`🔄 EmailPollingService - Polling reiniciado com intervalo de ${this.adaptiveInterval} minutos`);
    }
  }

  private async handleError(error: any): Promise<void> {
    console.error('🔄 EmailPollingService - Implementando retry logic...');
    
    // Aqui você pode implementar lógica de retry
    // Por enquanto, apenas log do erro
    console.error('❌ EmailPollingService - Erro detalhado:', error instanceof Error ? error.message : 'Erro desconhecido');
  }

  getStatus(): {
    isRunning: boolean;
    lastCheckTime: Date | null;
    processedCount: number;
    config: PollingConfig;
    adaptiveInterval: number;
    consecutiveEmptyChecks: number;
  } {
    return {
      isRunning: this.isRunning,
      lastCheckTime: this.lastCheckTime,
      processedCount: this.processedEmails.size,
      config: this.config,
      adaptiveInterval: this.adaptiveInterval,
      consecutiveEmptyChecks: this.consecutiveEmptyChecks
    };
  }

  async getStats(): Promise<{
    total: number;
    processed: number;
    errors: number;
    replied: number;
  }> {
    return await this.processor.getEmailStats();
  }

  clearProcessedEmails(): void {
    this.processedEmails.clear();
    console.log('🗑️ EmailPollingService - Lista de emails processados limpa');
  }
}

export default EmailPollingService;
