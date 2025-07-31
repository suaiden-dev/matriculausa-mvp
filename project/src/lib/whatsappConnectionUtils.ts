import { supabase } from './supabase';
import { generateChatwootPassword } from './chatwootUtils';

export interface WhatsAppConnectionData {
  user_id: string;
  university_id?: string;
  ai_configuration_id?: string;
  instance_name: string;
  connection_status: 'connecting' | 'connected' | 'disconnected' | 'error';
  phone_number?: string;
  evolution_instance_id?: string;
}

export interface ChatwootData {
  id_chatwoot?: string;
  user_id_chatwoot?: string;
  chatwoot_user_name?: string;
  chatwoot_access_token?: string;
}

export const generateUniqueInstanceName = (userName: string, userEmail: string): string => {
  const cleanName = (userName || userEmail || 'user').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const randomStr = Math.random().toString(36).substring(2, 12);
  return `${cleanName}_${randomStr}`;
};

export const connectWhatsAppForAgent = async (
  user: any,
  agentId: string,
  university?: any
): Promise<{
  success: boolean;
  qrCodeUrl?: string;
  instanceName?: string;
  chatwootData?: ChatwootData;
  error?: string;
}> => {
  try {
    console.log('🚀 [WhatsAppConnectionUtils] ===== INICIANDO CONFIGURAÇÃO CHATWOOT + WHATSAPP =====');
    
    const instanceName = generateUniqueInstanceName(
      user.user_metadata?.name || user.email,
      user.email
    );
    
    console.log('📋 [WhatsAppConnectionUtils] Instance Name:', instanceName);
    console.log('📋 [WhatsAppConnectionUtils] Agent ID:', agentId);
    console.log('📋 [WhatsAppConnectionUtils] User:', user.email);

    // 1. PRIMEIRO: Chamar webhook do Chatwoot
    console.log('📤 [WhatsAppConnectionUtils] ===== CHAMANDO WEBHOOK DO CHATWOOT =====');
    
    const chatwootPassword = generateChatwootPassword(user.email, user.id);
    const chatwootPayload = {
      user_name: user.user_metadata?.name || user.email,
      user_id: user.id,
      agent_id: agentId,
      instance_name: instanceName,
      email: user.email,
      password: chatwootPassword,
      plan: 'Basic',
      agents_count: 1
    };

    console.log('📤 [WhatsAppConnectionUtils] Chatwoot payload:', { ...chatwootPayload, password: '***' });
    console.log('📤 [WhatsAppConnectionUtils] URL:', 'https://nwh.suaiden.com/webhook/wootchat');

    const chatwootResponse = await fetch('https://nwh.suaiden.com/webhook/wootchat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chatwootPayload),
    });

    console.log('📥 [WhatsAppConnectionUtils] Status da resposta do Chatwoot:', chatwootResponse.status);

    if (!chatwootResponse.ok) {
      const errorText = await chatwootResponse.text();
      console.error('❌ [WhatsAppConnectionUtils] Erro no webhook do Chatwoot:', errorText);
      throw new Error(`Erro no webhook do Chatwoot: ${chatwootResponse.status} - ${errorText}`);
    }

    const chatwootResult = await chatwootResponse.text();
    console.log('📥 [WhatsAppConnectionUtils] Resposta completa do Chatwoot:', chatwootResult);
    console.log('✅ [WhatsAppConnectionUtils] Chatwoot configurado com sucesso');

    // SALVAR DADOS DO CHATWOOT NO BANCO
    let chatwootData: ChatwootData = {};
    try {
      let parsedChatwootData = null;
      try {
        parsedChatwootData = chatwootResult ? JSON.parse(chatwootResult) : null;
        console.log('🔍 [WhatsAppConnectionUtils] Dados parseados do Chatwoot:', parsedChatwootData);
      } catch (e) {
        console.error('❌ [WhatsAppConnectionUtils] Erro ao fazer parse da resposta do Chatwoot:', e);
      }

      if (parsedChatwootData) {
        // Mapear campos baseado na estrutura do SkillaBot
        const accountId = parsedChatwootData.id_chatwoot || parsedChatwootData.account_id || parsedChatwootData.chatwoot_account_id || parsedChatwootData.id;
        const userId = parsedChatwootData.user_id_chatwoot || parsedChatwootData.user_id || parsedChatwootData.chatwoot_user_id;
        const userName = parsedChatwootData.chatwoot_user_name || parsedChatwootData.user_name;
        const accessToken = parsedChatwootData.chatwoot_access_token || parsedChatwootData.access_token;

        chatwootData = {
          id_chatwoot: accountId,
          user_id_chatwoot: userId,
          chatwoot_user_name: userName,
          chatwoot_access_token: accessToken
        };

        console.log('💾 [WhatsAppConnectionUtils] Mapeamento dos dados do Chatwoot:', {
          user_id: user.id,
          chatwoot_user_name: userName,
          chatwoot_email: user.email,
          chatwoot_password: chatwootPassword,
          chatwoot_access_token: accessToken,
          chatwoot_instance_name: instanceName,
          chatwoot_user_id: userId,
          chatwoot_account_id: accountId
        });

        const { error: chatwootError } = await supabase
          .from('chatwoot_accounts')
          .upsert({
            user_id: user.id,
            chatwoot_user_name: userName,
            chatwoot_email: user.email,
            chatwoot_password: chatwootPassword,
            chatwoot_access_token: accessToken,
            chatwoot_instance_name: instanceName,
            chatwoot_user_id: userId,
            chatwoot_account_id: accountId
          }, { onConflict: 'user_id' });

        if (chatwootError) {
          console.error('❌ [WhatsAppConnectionUtils] Erro ao salvar dados do Chatwoot:', chatwootError);
        } else {
          console.log('✅ [WhatsAppConnectionUtils] Dados do Chatwoot salvos com sucesso');
        }
      } else {
        console.warn('⚠️ [WhatsAppConnectionUtils] Não foi possível extrair dados do Chatwoot da resposta');
      }
    } catch (error) {
      console.error('❌ [WhatsAppConnectionUtils] Erro ao processar dados do Chatwoot:', error);
    }

    // 2. DEPOIS: Chamar webhook do QR Code
    console.log('📤 [WhatsAppConnectionUtils] ===== CHAMANDO WEBHOOK DO QR CODE =====');
    
    const qrPayload = {
      user_name: user.user_metadata?.name || user.email,
      user_id: user.id,
      agent_id: agentId,
      instance_name: instanceName,
      email: user.email,
      password: chatwootPassword,
      id_chatwoot: chatwootData.id_chatwoot,
      user_id_chatwoot: chatwootData.user_id_chatwoot,
      university_id: university?.id,
      university_name: university?.name
    };

    console.log('📤 [WhatsAppConnectionUtils] QR payload:', qrPayload);
    console.log('📤 [WhatsAppConnectionUtils] URL:', 'https://nwh.suaiden.com/webhook/gerar_qr_code_whastapp_matriculausa');
    
    const response = await fetch('https://nwh.suaiden.com/webhook/gerar_qr_code_whastapp_matriculausa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(qrPayload),
    });

    console.log('📥 [WhatsAppConnectionUtils] Status da resposta do QR Code:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [WhatsAppConnectionUtils] Erro no webhook do QR Code:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    // Ler a resposta uma única vez
    const responseText = await response.text();
    console.log('📥 [WhatsAppConnectionUtils] Resposta completa do QR Code:', responseText.substring(0, 100) + '...');
    
    let qrCodeData = null;
    
    // Tentar processar como JSON primeiro
    try {
      const parsedResponse = JSON.parse(responseText);
      console.log('📥 [WhatsAppConnectionUtils] Response parsed as JSON:', parsedResponse);
      qrCodeData = parsedResponse.qrCode || parsedResponse.base64 || parsedResponse.qr_code;
    } catch (jsonError) {
      console.log('📥 [WhatsAppConnectionUtils] Response is not JSON, treating as base64 string');
      // Verificar se é base64 válido
      if (responseText && /^[A-Za-z0-9+/=]+$/.test(responseText) && responseText.length > 100) {
        qrCodeData = responseText;
      }
    }
    
    if (qrCodeData && /^[A-Za-z0-9+/=]+$/.test(qrCodeData) && qrCodeData.length > 100) {
      console.log('✅ [WhatsAppConnectionUtils] Valid QR code data detected');
      console.log('✅ [WhatsAppConnectionUtils] QR code generated successfully');
      
      // SALVAR INSTANCE_NAME NO BANCO DE DADOS
      if (user && instanceName) {
        console.log('💾 [WhatsAppConnectionUtils] Saving instance_name to database:', instanceName);
        console.log('💾 [WhatsAppConnectionUtils] User ID:', user.id);
        console.log('💾 [WhatsAppConnectionUtils] User email:', user.email);
        
        const newConnection = {
          user_id: user.id,
          university_id: university?.id || user.id, // Usar university_id se disponível, senão usar user_id
          ai_configuration_id: agentId,
          evolution_instance_id: instanceName,
          connection_status: 'connecting',
          phone_number: 'Connecting...',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('💾 [WhatsAppConnectionUtils] New connection object:', newConnection);

        const { data: savedConnection, error: saveError } = await supabase
          .from('whatsapp_connections')
          .insert([newConnection])
          .select()
          .single();

        if (saveError) {
          console.error('❌ Error saving instance_name to database:', saveError);
          console.error('❌ Error details:', saveError.message);
          console.error('❌ Error code:', saveError.code);
        } else {
          console.log('✅ Instance_name saved to database:', savedConnection);
          console.log('✅ Saved connection ID:', savedConnection?.id);
        }
      } else {
        console.error('❌ Cannot save instance_name - missing required data:');
        console.error('❌ User:', !!user);
        console.error('❌ Instance name:', !!instanceName);
        console.error('❌ User ID:', user?.id);
      }
      
      return {
        success: true,
        qrCodeUrl: qrCodeData,
        instanceName,
        chatwootData
      };
    } else {
      throw new Error("QR Code not found or invalid in response");
    }

  } catch (error) {
    console.error('❌ [WhatsAppConnectionUtils] Error connecting WhatsApp:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const refreshQrCode = async (
  user: any,
  agentId: string,
  instanceName: string,
  chatwootData?: ChatwootData
): Promise<{
  success: boolean;
  qrCodeUrl?: string;
  error?: string;
}> => {
  try {
    console.log('🔄 [WhatsAppConnectionUtils] Refreshing QR code...');
    console.log('📋 [WhatsAppConnectionUtils] Instance Name:', instanceName);
    console.log('📋 [WhatsAppConnectionUtils] Agent ID:', agentId);

    const response = await fetch('https://nwh.suaiden.com/webhook/qrcode_atualizado', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: user.id,
        agent_id: agentId,
        instance_name: instanceName,
        id_chatwoot: chatwootData?.id_chatwoot,
        user_id_chatwoot: chatwootData?.user_id_chatwoot
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [WhatsAppConnectionUtils] Error refreshing QR code:', errorText);
      throw new Error(`Error refreshing QR code: ${response.status} - ${errorText}`);
    }

    const responseText = await response.text();
    console.log('📥 [WhatsAppConnectionUtils] QR refresh response:', responseText.substring(0, 100) + '...');

    let qrCodeData = null;
    try {
      const parsedResponse = JSON.parse(responseText);
      qrCodeData = parsedResponse.qrCode || parsedResponse.base64;
    } catch (jsonError) {
      if (responseText && /^[A-Za-z0-9+/=]+$/.test(responseText) && responseText.length > 100) {
        qrCodeData = responseText;
      }
    }

    if (qrCodeData && /^[A-Za-z0-9+/=]+$/.test(qrCodeData) && qrCodeData.length > 100) {
      console.log('✅ [WhatsAppConnectionUtils] QR code refreshed successfully');
      return {
        success: true,
        qrCodeUrl: qrCodeData
      };
    } else {
      throw new Error("Invalid QR code response");
    }
  } catch (error) {
    console.error('❌ [WhatsAppConnectionUtils] Error refreshing QR code:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}; 