// Função para gerar senha única do Chatwoot
export const generateChatwootPassword = (email: string, userId: string): string => {
  // Criar base única usando email + userId + timestamp
  const baseString = `${email}${userId}${Date.now()}`;
  const base64String = btoa(baseString);
  let password = base64String.substring(0, 10);

  const specialChars = "!@#$%&*";
  const numbers = "0123456789";

  // Garante pelo menos um número
  if (!/[0-9]/.test(password)) {
    const randomNumber = numbers[Math.floor(Math.random() * numbers.length)];
    const pos = Math.floor(Math.random() * password.length);
    password = password.slice(0, pos) + randomNumber + password.slice(pos + 1);
  }

  // Garante pelo menos um caractere especial
  if (!/[!@#$%&*]/.test(password)) {
    const randomSpecial = specialChars[Math.floor(Math.random() * specialChars.length)];
    const pos = Math.floor(Math.random() * password.length);
    password = password.slice(0, pos) + randomSpecial + password.slice(pos + 1);
  }

  return password;
};

// Função para gerar nome único da instância
export const generateUniqueInstanceName = (userName: string): string => {
  const cleanName = userName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const randomStr = Math.random().toString(36).substring(2, 12);
  return `${cleanName}_${randomStr}`;
};

// Função que segue o mesmo padrão do WhatsAppConnection.tsx
export const createChatwootAndQRCodeDirect = async (
  userId: string,
  email: string,
  name: string,
  plan: string = 'Basic',
  agentsCount: number = 1
): Promise<{
  success: boolean;
  qr_code?: string;
  instance_name?: string;
  chatwoot_access_token?: string;
  chatwoot_password?: string;
  message?: string;
  error?: string;
}> => {
  try {
    console.log('🚀 [ChatwootUtils] ===== INICIANDO CRIAÇÃO DIRETA (PADRÃO WHATSAPP) =====');
    console.log('📋 [ChatwootUtils] Dados recebidos:', { userId, email, name, plan, agentsCount });

    // Gerar senha e nome da instância (mesmo padrão do WhatsAppConnection)
    const chatwootPassword = generateChatwootPassword(email, userId);
    const userName = name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const randomStr = Math.random().toString(36).substring(2, 12);
    const instanceName = `${userName}_${randomStr}`;

    console.log('🔐 [ChatwootUtils] Senha gerada:', chatwootPassword);
    console.log('🏷️ [ChatwootUtils] Nome da instância:', instanceName);

    // 1. PRIMEIRO: Chamar webhook do Chatwoot (mesmo padrão do WhatsAppConnection)
    const chatwootPayload = {
      user_name: name,
      user_id: userId,
      instance_name: instanceName,
      email: email,
      password: chatwootPassword,
      plan: plan,
      agents_count: agentsCount
    };

    console.log('📤 [ChatwootUtils] ===== CHAMANDO WEBHOOK DO CHATWOOT =====');
    console.log('📤 [ChatwootUtils] URL:', 'https://nwh.suaiden.com/webhook/wootchat');
    console.log('📤 [ChatwootUtils] Payload:', { ...chatwootPayload, password: '***' });

    const chatwootResponse = await fetch('https://nwh.suaiden.com/webhook/wootchat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chatwootPayload),
    });

    console.log('📥 [ChatwootUtils] Status da resposta do Chatwoot:', chatwootResponse.status);

    if (!chatwootResponse.ok) {
      const errorText = await chatwootResponse.text();
      console.error('❌ [ChatwootUtils] Erro no webhook do Chatwoot:', errorText);
      throw new Error(`Erro no webhook do Chatwoot: ${chatwootResponse.status} - ${errorText}`);
    }

    const chatwootResult = await chatwootResponse.text();
    console.log('📥 [ChatwootUtils] Resposta completa do Chatwoot:', chatwootResult.substring(0, 200) + '...');
    console.log('📥 [ChatwootUtils] Tamanho da resposta:', chatwootResult.length);

    let accessToken = '';
    try {
      const jsonResult = JSON.parse(chatwootResult);
      console.log('📥 [ChatwootUtils] Resposta parseada como JSON:', jsonResult);
      accessToken = jsonResult.access_token || jsonResult.chatwoot_access_token || '';
    } catch (parseError) {
      console.log('📥 [ChatwootUtils] Resposta não é JSON, tratando como string');
      accessToken = chatwootResult;
    }

    console.log('🔑 [ChatwootUtils] Access token obtido:', accessToken ? 'Sim' : 'Não');
    console.log('🔑 [ChatwootUtils] Access token:', accessToken);

    // 2. DEPOIS: Chamar webhook do QR Code (mesmo padrão do WhatsAppConnection)
    const qrPayload = {
      instance_name: instanceName,
      university_id: userId, // usando userId como university_id
      university_name: name,
      user_email: email,
      user_id: userId,
      timestamp: new Date().toISOString(),
      user_metadata: {
        name: name,
        email: email
      },
      university_metadata: {
        name: name,
        id: userId
      }
    };

    console.log('📤 [ChatwootUtils] ===== CHAMANDO WEBHOOK DO QR CODE =====');
    console.log('📤 [ChatwootUtils] URL:', 'https://nwh.suaiden.com/webhook/gerar_qr_code_whastapp_matriculausa');
    console.log('📤 [ChatwootUtils] Payload:', qrPayload);

    const qrResponse = await fetch('https://nwh.suaiden.com/webhook/gerar_qr_code_whastapp_matriculausa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(qrPayload),
    });

    console.log('📥 [ChatwootUtils] Status da resposta do QR Code:', qrResponse.status);

    if (!qrResponse.ok) {
      const errorText = await qrResponse.text();
      console.error('❌ [ChatwootUtils] Erro no webhook do QR Code:', errorText);
      throw new Error(`Erro no webhook do QR Code: ${qrResponse.status} - ${errorText}`);
    }

    const qrResult = await qrResponse.text();
    console.log('📥 [ChatwootUtils] Resposta completa do QR Code:', qrResult.substring(0, 200) + '...');
    console.log('📥 [ChatwootUtils] Tamanho da resposta QR:', qrResult.length);

    let qrCodeData = null;
    
    // Tentar processar como JSON primeiro (mesmo padrão do WhatsAppConnection)
    try {
      const parsedResponse = JSON.parse(qrResult);
      console.log('📥 [ChatwootUtils] Response parsed as JSON:', parsedResponse);
      qrCodeData = parsedResponse.qrCode || parsedResponse.base64 || parsedResponse.qr_code;
    } catch (jsonError) {
      console.log('📥 [ChatwootUtils] Response is not JSON, treating as base64 string');
      // Verificar se é base64 válido
      if (qrResult && /^[A-Za-z0-9+/=]+$/.test(qrResult) && qrResult.length > 100) {
        qrCodeData = qrResult;
      }
    }

    // Validar se o QR code é válido (mesmo padrão do WhatsAppConnection)
    if (qrCodeData && /^[A-Za-z0-9+/=]+$/.test(qrCodeData) && qrCodeData.length > 100) {
      console.log('✅ [ChatwootUtils] Valid QR code data detected, setting URL');
      console.log('✅ [ChatwootUtils] QR code generated successfully');
    } else {
      console.error('❌ [ChatwootUtils] QR Code inválido:', {
        hasData: !!qrCodeData,
        isBase64: qrCodeData ? /^[A-Za-z0-9+/=]+$/.test(qrCodeData) : false,
        length: qrCodeData ? qrCodeData.length : 0
      });
      throw new Error("QR Code inválido ou não encontrado");
    }

    // 3. Salvar dados no banco (mesmo padrão do WhatsAppConnection)
    console.log('💾 [ChatwootUtils] ===== SALVANDO DADOS NO BANCO =====');
    
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL!,
      import.meta.env.VITE_SUPABASE_ANON_KEY!
    );

    // Salvar dados do Chatwoot
    console.log('💾 [ChatwootUtils] Salvando dados do Chatwoot...');
    const { error: chatwootError } = await supabase
      .from('chatwoot_accounts')
      .upsert({
        user_id: userId,
        chatwoot_user_name: name,
        chatwoot_email: email,
        chatwoot_password: chatwootPassword,
        chatwoot_access_token: accessToken,
        chatwoot_instance_name: instanceName,
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id' 
      });

    if (chatwootError) {
      console.error('❌ [ChatwootUtils] Erro ao salvar dados do Chatwoot:', chatwootError);
      return {
        success: false,
        error: chatwootError.message
      };
    }

    console.log('✅ [ChatwootUtils] Dados do Chatwoot salvos com sucesso');

    // Salvar dados do WhatsApp (mesmo padrão do WhatsAppConnection)
    console.log('💾 [ChatwootUtils] Salvando dados do WhatsApp...');
    const newConnection = {
      user_id: userId,
      evolution_instance_id: instanceName,
      connection_status: 'connecting',
      qr_code: qrCodeData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('💾 [ChatwootUtils] New connection object:', newConnection);

    const { data: savedConnection, error: whatsappError } = await supabase
      .from('whatsapp_connections')
      .insert([newConnection])
      .select()
      .single();

    if (whatsappError) {
      console.error('❌ [ChatwootUtils] Erro ao salvar dados do WhatsApp:', whatsappError);
      console.error('❌ [ChatwootUtils] Error details:', whatsappError.message);
      console.error('❌ [ChatwootUtils] Error code:', whatsappError.code);
      return {
        success: false,
        error: whatsappError.message
      };
    }

    console.log('✅ [ChatwootUtils] Dados do WhatsApp salvos com sucesso');
    console.log('✅ [ChatwootUtils] Saved connection ID:', savedConnection?.id);
    console.log('🎉 [ChatwootUtils] ===== CONFIGURAÇÃO CONCLUÍDA COM SUCESSO =====');

    return {
      success: true,
      qr_code: qrCodeData,
      instance_name: instanceName,
      chatwoot_access_token: accessToken,
      chatwoot_password: chatwootPassword,
      message: 'Chatwoot e QR Code configurados com sucesso'
    };

  } catch (error) {
    console.error('💥 [ChatwootUtils] ===== ERRO NA CRIAÇÃO VIA WEBHOOKS =====');
    console.error('💥 [ChatwootUtils] Erro:', error);
    console.error('💥 [ChatwootUtils] Stack:', error instanceof Error ? error.stack : 'N/A');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
};

// Função principal para criar conta Chatwoot e gerar QR Code (via edge function)
export const createAndSaveChatwootAccount = async (
  userId: string,
  email: string,
  name: string,
  plan: string = 'Basic',
  agentsCount: number = 1
): Promise<{
  success: boolean;
  qr_code?: string;
  instance_name?: string;
  chatwoot_access_token?: string;
  chatwoot_password?: string;
  message?: string;
  error?: string;
}> => {
  try {
    console.log('[ChatwootUtils] Iniciando criação de conta Chatwoot + QR Code');
    console.log('[ChatwootUtils] Dados:', { userId, email, name, plan, agentsCount });

    // Preparar payload para a edge function
    const payload = {
      user_id: userId,
      email: email,
      user_name: name,
      plan: plan,
      agents_count: agentsCount
    };

    console.log('[ChatwootUtils] Chamando edge function integrate-chatwoot-qr');

    // Obter token de autenticação
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL!,
      import.meta.env.VITE_SUPABASE_ANON_KEY!
    );
    
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    if (!accessToken) {
      console.error('[ChatwootUtils] Usuário não autenticado');
      return {
        success: false,
        error: 'Usuário não autenticado'
      };
    }

    // Chamar a edge function que integra Chatwoot + QR Code
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/integrate-chatwoot-qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ChatwootUtils] Erro na edge function:', response.status, errorText);
      throw new Error(`Erro na edge function: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('[ChatwootUtils] Resposta da edge function:', result);

    if (result.success) {
      console.log('[ChatwootUtils] Chatwoot e QR Code configurados com sucesso');
      return {
        success: true,
        qr_code: result.qr_code,
        instance_name: result.instance_name,
        chatwoot_access_token: result.chatwoot_access_token,
        chatwoot_password: result.chatwoot_password,
        message: result.message
      };
    } else {
      console.error('[ChatwootUtils] Erro retornado pela edge function:', result.error);
      return {
        success: false,
        error: result.error || 'Erro desconhecido na configuração'
      };
    }

  } catch (error) {
    console.error('[ChatwootUtils] Erro na criação da conta Chatwoot:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
};

// Função para obter dados da conta Chatwoot
export const getChatwootAccountData = async (userId: string) => {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL!,
      import.meta.env.VITE_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase
      .from('chatwoot_accounts')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('[ChatwootUtils] Erro ao buscar dados do Chatwoot:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[ChatwootUtils] Erro ao buscar dados do Chatwoot:', error);
    return null;
  }
};

// Função para obter dados da conexão WhatsApp
export const getWhatsAppConnectionData = async (userId: string) => {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL!,
      import.meta.env.VITE_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase
      .from('whatsapp_connections')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('[ChatwootUtils] Erro ao buscar dados do WhatsApp:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[ChatwootUtils] Erro ao buscar dados do WhatsApp:', error);
    return null;
  }
}; 

// Função simples para testar apenas o webhook do Chatwoot
export const testChatwootWebhook = async (
  userId: string,
  email: string,
  name: string
): Promise<{ success: boolean; error?: string; response?: any }> => {
  try {
    console.log('🧪 [ChatwootUtils] ===== TESTE SIMPLES DO WEBHOOK CHATWOOT =====');
    console.log('🧪 [ChatwootUtils] Dados:', { userId, email, name });

    const chatwootPassword = generateChatwootPassword(email, userId);
    const instanceName = generateUniqueInstanceName(name);

    console.log('🧪 [ChatwootUtils] Senha:', chatwootPassword);
    console.log('🧪 [ChatwootUtils] Instance:', instanceName);

    const payload = {
      user_name: name,
      user_id: userId,
      instance_name: instanceName,
      email: email,
      password: chatwootPassword,
      plan: 'Basic',
      agents_count: 1
    };

    console.log('🧪 [ChatwootUtils] Payload:', { ...payload, password: '***' });
    console.log('🧪 [ChatwootUtils] URL:', 'https://nwh.suaiden.com/webhook/wootchat');

    const response = await fetch('https://nwh.suaiden.com/webhook/wootchat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('🧪 [ChatwootUtils] Status:', response.status);
    console.log('🧪 [ChatwootUtils] Headers:', Object.fromEntries(response.headers.entries()));

    const result = await response.text();
    console.log('🧪 [ChatwootUtils] Resposta:', result);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${result}`
      };
    }

    return {
      success: true,
      response: result
    };

  } catch (error) {
    console.error('💥 [ChatwootUtils] Erro no teste:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}; 