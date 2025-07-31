// Função para gerar caracteres aleatórios
export const generateRandomString = (length: number): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Função para gerar instance name único
export const generateUniqueInstanceName = (userEmail: string): string => {
  const userName = userEmail?.split('@')[0] || 'user';
  const randomSuffix = generateRandomString(10);
  return `${userName}_${randomSuffix}`;
};

// Função para validar a conexão WhatsApp
export const validateWhatsAppConnection = async (
  instanceName: string,
  payload: any
): Promise<{
  state: string | null;
  number: string | null;
  inboxPayloads: Array<{ state: string; inbox_id?: string; user_id?: string }>;
} | null> => {
  try {
    console.log('🚀 validateWhatsAppConnection called with instanceName:', instanceName);
    
    const response = await fetch('https://nwh.suaiden.com/webhook/qr_validado', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('qr_validado webhook error response:', errorText);
      return null;
    }

    const responseText = await response.text();
    let state: string | null = null;
    let number: string | null = null;
    let inboxPayloads: Array<{ state: string; inbox_id?: string; user_id?: string }> = [];

    try {
      const json = JSON.parse(responseText);
      let arrayToProcess = Array.isArray(json) ? json : json.data || [json];
      
      if (Array.isArray(arrayToProcess)) {
        inboxPayloads = arrayToProcess.map((item: any) => ({
          state: item.state,
          inbox_id: item.inbox_id,
          user_id: item.user_id
        }));
        state = arrayToProcess[0]?.state;
        number = arrayToProcess[0]?.number;
      } else {
        state = arrayToProcess.state;
        number = arrayToProcess.number;
        inboxPayloads = [{
          state: state || 'unknown',
          inbox_id: arrayToProcess.inbox_id,
          user_id: arrayToProcess.user_id
        }];
      }
    } catch (jsonError) {
      if (responseText.toLowerCase().includes('open')) {
        state = 'open';
      } else if (responseText.toLowerCase().includes('closed')) {
        state = 'closed';
      }
    }

    return {
      state,
      number,
      inboxPayloads
    };
  } catch (error) {
    console.error('Error validating WhatsApp connection:', error);
    return null;
  }
};