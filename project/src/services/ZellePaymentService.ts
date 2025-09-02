import { supabase } from '../lib/supabase';

// Interface para dados do pagamento Zelle (baseada na estrutura real da tabela)
export interface ZellePaymentData {
  id?: number;
  created_at?: string;
  confirmation_code: string; // Código Zelle obrigatório
  used: boolean; // Se o código foi usado/processado
}

// Interface para resultado da operação
export interface ZellePaymentResult {
  success: boolean;
  data?: ZellePaymentData;
  error?: string;
}

class ZellePaymentService {
  private edgeFunctionUrl: string;

  constructor() {
    this.edgeFunctionUrl = `${supabase.supabaseUrl}/functions/v1/zelle-payment-manager`;
    console.log('✅ [ZellePaymentService] Serviço inicializado com Edge Function');
  }

  /**
   * Chama a Edge Function para inserir código Zelle no PostgreSQL externo
   */
  private async callEdgeFunction(confirmationCode: string): Promise<ZellePaymentResult> {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('Usuário não autenticado');
      }

      const response = await fetch(this.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          confirmation_code: confirmationCode
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro na Edge Function');
      }

      return result;
    } catch (error) {
      console.error('❌ [ZellePaymentService] Erro ao chamar Edge Function:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Insere um código Zelle no PostgreSQL externo
   */
  async insertZelleCode(confirmationCode: string): Promise<ZellePaymentResult> {
    return await this.callEdgeFunction(confirmationCode);
  }
}

// Instância singleton do serviço
export const zellePaymentService = new ZellePaymentService();

// Função utilitária para inserir código Zelle
export const insertZelleCode = async (confirmationCode: string) => {
  return await zellePaymentService.insertZelleCode(confirmationCode);
};

export default ZellePaymentService;
