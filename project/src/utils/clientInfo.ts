export interface ClientInfo {
  registration_ip: string | null;
  user_agent: string;
}

/**
 * Captura o IP real do usuário usando o serviço ipify
 * e o User-Agent do navegador.
 */
export const getClientInfo = async (): Promise<ClientInfo> => {
  try {
    // Tenta obter o IP do ipify (formato JSON)
    const response = await fetch('https://api.ipify.org?format=json');
    if (!response.ok) throw new Error('Network response was not ok');
    
    const data = await response.json();
    
    return {
      registration_ip: data.ip || null,
      user_agent: navigator.userAgent
    };
  } catch (error) {
    console.warn('⚠️ [ClientInfo] Não foi possível obter o endereço IP:', error);
    
    // Fallback: retorna apenas o User-Agent se o IP falhar
    return {
      registration_ip: null,
      user_agent: navigator.userAgent
    };
  }
};
