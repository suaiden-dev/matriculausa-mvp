interface NotificationPayload {
  tipo_notf: string;
  email_aluno: string;
  nome_aluno: string;
  nome_bolsa?: string;
  nome_universidade?: string;
  email_universidade: string;
  o_que_enviar: string;
  [key: string]: any; // Para campos adicionais específicos
}

interface NotificationResponse {
  success: boolean;
  status?: number;
  response?: string;
  error?: string;
}

class NotificationService {
  private static readonly WEBHOOK_URL = 'https://nwh.suaiden.com/webhook/notfmatriculausa';
  private static readonly USER_AGENT = 'PostmanRuntime/7.36.3';

  /**
   * Envia notificação para universidade via webhook n8n
   */
  static async sendUniversityNotification(payload: NotificationPayload): Promise<NotificationResponse> {
    try {
      console.log('[NotificationService] Enviando notificação:', payload);

      const response = await fetch(this.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': this.USER_AGENT,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      
      console.log('[NotificationService] Resposta do webhook:', {
        status: response.status,
        response: responseText
      });

      return {
        success: response.ok,
        status: response.status,
        response: responseText
      };
    } catch (error: any) {
      console.error('[NotificationService] Erro ao enviar notificação:', error);
      return {
        success: false,
        error: error.message || 'Erro desconhecido'
      };
    }
  }

  /**
   * Cria payload para notificação de confirmação de universidades
   */
  static createUniversityConfirmationPayload(
    studentName: string,
    studentEmail: string,
    universityName: string,
    universityEmail: string,
    scholarshipTitle?: string
  ): NotificationPayload {
    const scholarshipText = scholarshipTitle ? ` para a bolsa "${scholarshipTitle}"` : '';
    const message = `O aluno ${studentName} confirmou interesse em seguir com o processo seletivo${scholarshipText} na universidade ${universityName}. Acesse o painel para revisar a candidatura.`;

    return {
      tipo_notf: 'Confirmação de interesse do aluno',
      email_aluno: studentEmail,
      nome_aluno: studentName,
      nome_bolsa: scholarshipTitle || '',
      nome_universidade: universityName,
      email_universidade: universityEmail,
      o_que_enviar: message
    };
  }

  /**
   * Cria payload para notificação de upload de documentos
   */
  static createDocumentUploadPayload(
    studentName: string,
    studentEmail: string,
    universityName: string,
    universityEmail: string,
    documentType: string,
    scholarshipTitle?: string
  ): NotificationPayload {
    const scholarshipText = scholarshipTitle ? ` para a bolsa "${scholarshipTitle}"` : '';
    const message = `O aluno ${studentName} enviou o documento "${documentType}"${scholarshipText}. Acesse o painel para revisar.`;

    return {
      tipo_notf: 'Novo documento enviado pelo aluno',
      email_aluno: studentEmail,
      nome_aluno: studentName,
      nome_bolsa: scholarshipTitle || '',
      nome_universidade: universityName,
      email_universidade: universityEmail,
      o_que_enviar: message,
      document_type: documentType
    };
  }

  /**
   * Cria payload para notificação de pagamento de taxa
   */
  static createPaymentNotificationPayload(
    studentName: string,
    studentEmail: string,
    universityName: string,
    universityEmail: string,
    paymentType: 'application_fee' | 'scholarship_fee',
    scholarshipTitle?: string
  ): NotificationPayload {
    const feeTypeText = paymentType === 'application_fee' ? 'taxa de aplicação' : 'taxa de bolsa';
    const scholarshipText = scholarshipTitle ? ` para a bolsa "${scholarshipTitle}"` : '';
    const message = `O aluno ${studentName} pagou a ${feeTypeText}${scholarshipText} na universidade ${universityName}. Acesse o painel para revisar a candidatura.`;

    return {
      tipo_notf: `Novo pagamento de ${feeTypeText}`,
      email_aluno: studentEmail,
      nome_aluno: studentName,
      nome_bolsa: scholarshipTitle || '',
      nome_universidade: universityName,
      email_universidade: universityEmail,
      o_que_enviar: message,
      payment_type: paymentType
    };
  }

  /**
   * Cria payload específico para notificar UNIVERSIDADE sobre pagamento de application fee
   */
  static createUniversityApplicationFeePaymentPayload(
    studentName: string,
    studentEmail: string,
    universityName: string,
    universityEmail: string,
    scholarshipTitle: string,
    paymentAmount: number,
    paymentMethod: 'stripe' | 'zelle',
    paymentId?: string
  ): NotificationPayload {
    const paymentMethodText = paymentMethod === 'stripe' ? 'Stripe' : 'Zelle';
    const message = `O aluno ${studentName} pagou a taxa de aplicação de $${paymentAmount} via ${paymentMethodText} para a bolsa "${scholarshipTitle}" da universidade ${universityName}. Acesse o painel para revisar a candidatura.`;
    
    return {
      tipo_notf: 'Notificação para Universidade - Pagamento de Application Fee',
      email_aluno: studentEmail,
      nome_aluno: studentName,
      nome_bolsa: scholarshipTitle,
      nome_universidade: universityName,
      email_universidade: universityEmail,
      o_que_enviar: message,
      payment_amount: paymentAmount,
      payment_method: paymentMethod,
      payment_id: paymentId || '',
      notification_target: 'university'
    };
  }

  /**
   * Cria payload para notificação de seleção de universidade para processo seletivo
   */
  static createUniversitySelectionPayload(
    studentName: string,
    studentEmail: string,
    universityName: string,
    universityEmail: string,
    scholarshipTitle: string
  ): NotificationPayload {
    const message = `O aluno ${studentName} selecionou a bolsa "${scholarshipTitle}" da universidade ${universityName} para participar do processo seletivo. Acesse o painel para revisar a candidatura.`;

    return {
      tipo_notf: 'Aluno selecionou universidade para processo seletivo',
      email_aluno: studentEmail,
      nome_aluno: studentName,
      nome_bolsa: scholarshipTitle,
      nome_universidade: universityName,
      email_universidade: universityEmail,
      o_que_enviar: message
    };
  }

  /**
   * Cria payload para notificação de pagamento de application fee
   */
  static createApplicationFeePaymentPayload(
    studentName: string,
    studentEmail: string,
    universityName: string,
    universityEmail: string,
    scholarshipTitle: string,
    paymentAmount: number,
    paymentMethod: 'stripe' | 'zelle',
    paymentId?: string
  ): NotificationPayload {
    const paymentMethodText = paymentMethod === 'stripe' ? 'Stripe' : 'Zelle';
    const message = `O aluno ${studentName} pagou a taxa de aplicação de $${paymentAmount} via ${paymentMethodText} para a bolsa "${scholarshipTitle}" da universidade ${universityName}. Acesse o painel para revisar a candidatura.`;

    return {
      tipo_notf: 'Novo pagamento de application fee',
      email_aluno: studentEmail,
      nome_aluno: studentName,
      nome_bolsa: scholarshipTitle,
      nome_universidade: universityName,
      email_universidade: universityEmail,
      o_que_enviar: message
    };
  }
}

export default NotificationService;