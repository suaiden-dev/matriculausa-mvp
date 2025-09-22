import { EmailProcessor } from './emailProcessor.js';

export class EmailPollingService {
  constructor(accessToken, aiApiKey, userId = null, userEmail = null, config = {}) {
    this.processor = new EmailProcessor(accessToken, aiApiKey, userId, userEmail);
    this.config = {
      intervalMinutes: 0.5, // Verificar a cada 30 segundos
      maxRetries: 3,
      retryDelayMs: 5000,
      ...config
    };
    this.intervalId = null;
    this.isRunning = false;
    this.lastCheckTime = null;
    this.processedEmails = new Set();
    this.processedCount = 0;
  }

  async start() {
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

  async stop() {
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

  async checkForNewEmails() {
    try {
      console.log('🔍 EmailPollingService - Verificando novos emails...');
      console.log(`🕐 EmailPollingService - Última verificação: ${this.lastCheckTime?.toISOString()}`);
      
      const processedEmails = await this.processor.processNewEmails();
      
      // Filtrar emails já processados
      const newEmails = processedEmails.filter(email => !this.processedEmails.has(email.id));
      
      if (newEmails.length > 0) {
        console.log(`📧 EmailPollingService - ${newEmails.length} novos emails processados`);
        
        // Adicionar aos processados
        newEmails.forEach(email => {
          this.processedEmails.add(email.id);
        });

        // Atualizar contador
        this.processedCount += newEmails.length;

        // Log detalhado
        newEmails.forEach(email => {
          console.log(`📧 EmailPollingService - Email: ${email.subject} | Status: ${email.status} | Resposta: ${email.response ? 'Sim' : 'Não'}`);
        });
      } else {
        console.log('📭 EmailPollingService - Nenhum email novo encontrado');
      }

      this.lastCheckTime = new Date();
      
    } catch (error) {
      console.error('❌ EmailPollingService - Erro ao verificar emails:', error);
      
      // Implementar retry logic se necessário
      await this.handleError(error);
    }
  }

  async handleError(error) {
    console.error('🔄 EmailPollingService - Implementando retry logic...');
    
    // Aqui você pode implementar lógica de retry
    // Por enquanto, apenas log do erro
    console.error('❌ EmailPollingService - Erro detalhado:', error instanceof Error ? error.message : 'Erro desconhecido');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastCheckTime: this.lastCheckTime,
      processedCount: this.processedCount,
      config: this.config
    };
  }

  async getStats() {
    try {
      return await this.processor.getEmailStats();
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return {
        total: this.processedCount,
        processed: this.processedCount,
        errors: 0,
        replied: 0
      };
    }
  }

  clearProcessedEmails() {
    this.processedEmails.clear();
    console.log('🗑️ EmailPollingService - Lista de emails processados limpa');
  }
}

export default EmailPollingService;
