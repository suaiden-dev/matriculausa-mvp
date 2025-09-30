import { PublicClientApplication, AccountInfo } from '@azure/msal-browser';
import { getOptimizedMsalConfig } from './microsoftAuthConfig';

/**
 * Gerenciador de contas MSAL para múltiplas contas Microsoft
 * Resolve o problema de conflitos entre múltiplas contas conectadas
 */
export class MSALAccountManager {
  private static instance: MSALAccountManager;
  private msalInstance: PublicClientApplication | null = null;

  static getInstance(): MSALAccountManager {
    if (!MSALAccountManager.instance) {
      MSALAccountManager.instance = new MSALAccountManager();
    }
    return MSALAccountManager.instance;
  }

  /**
   * Obter instância MSAL centralizada
   */
  async getMSALInstance(): Promise<PublicClientApplication> {
    if (!this.msalInstance) {
      const msalConfig = getOptimizedMsalConfig();
      this.msalInstance = new PublicClientApplication(msalConfig);
      await this.msalInstance.initialize();
      
      // Armazenar na window para compatibilidade
      (window as any).msalInstance = this.msalInstance;
    }
    return this.msalInstance;
  }

  /**
   * Encontrar conta específica baseada no email
   */
  async findAccountByEmail(email: string): Promise<AccountInfo | null> {
    const instance = await this.getMSALInstance();
    const accounts = instance.getAllAccounts();
    
    // Buscar conta por username ou localAccountId
    const targetAccount = accounts.find(acc => 
      acc.username === email || 
      acc.localAccountId === email ||
      acc.homeAccountId?.includes(email)
    );
    
    if (targetAccount) {
      console.log('🎯 Conta MSAL encontrada:', targetAccount.username);
      return targetAccount;
    }
    
    console.warn('⚠️ Conta MSAL não encontrada para:', email);
    return null;
  }

  /**
   * Limpar contas antigas para evitar conflitos
   */
  async cleanupOldAccounts(): Promise<void> {
    const instance = await this.getMSALInstance();
    const accounts = instance.getAllAccounts();
    
    if (accounts.length > 5) {
      console.log('🧹 Limpando contas antigas do MSAL');
      try {
        await instance.clearCache();
      } catch (error) {
        console.warn('⚠️ Erro ao limpar cache MSAL:', error);
      }
    }
  }

  /**
   * Obter token para conta específica
   */
  async getTokenForAccount(email: string, scopes: string[]): Promise<string | null> {
    try {
      const instance = await this.getMSALInstance();
      const account = await this.findAccountByEmail(email);
      
      if (!account) {
        console.error('❌ Conta não encontrada no MSAL:', email);
        return null;
      }

      const response = await instance.acquireTokenSilent({
        scopes,
        account,
        forceRefresh: true
      });

      console.log('✅ Token obtido para conta:', email);
      return response.accessToken;
    } catch (error) {
      console.error('❌ Erro ao obter token para conta:', email, error);
      return null;
    }
  }

  /**
   * Limpar instância MSAL
   */
  clearInstance(): void {
    this.msalInstance = null;
    (window as any).msalInstance = null;
  }

  /**
   * Verificar se há conflitos de contas
   */
  async hasAccountConflicts(): Promise<boolean> {
    const instance = await this.getMSALInstance();
    const accounts = instance.getAllAccounts();
    
    // Verificar se há contas duplicadas ou conflitantes
    const emails = accounts.map(acc => acc.username).filter(Boolean);
    const uniqueEmails = new Set(emails);
    
    return emails.length !== uniqueEmails.size;
  }
}

export default MSALAccountManager;
