import { supabase } from '../lib/supabase';

export interface UniversityNotificationPayload {
  studentId: string;
  universityId?: string;
  scholarshipId?: string;
  applicationId?: string;
  tipoNotf: string;
  customMessage?: string;
  redirectUrl?: string;
  metadata?: any;
}

/**
 * Envia uma notificação para a universidade através da Edge Function centralizada.
 * O universityId pode ser omitido se o scholarshipId for fornecido (a função buscará no banco).
 */
export const sendUniversityNotification = async (payload: UniversityNotificationPayload) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.warn('[sendUniversityNotification] Usuário não autenticado, enviando sem token...');
    }

    // Disparo assíncrono para não bloquear o fluxo do usuário
    fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/send-university-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`
      },
      body: JSON.stringify(payload),
    }).catch(err => console.error('Erro assíncrono na notificação da universidade:', err));
    
  } catch (err) {
    console.error('Erro ao preparar notificação da universidade:', err);
  }
};
