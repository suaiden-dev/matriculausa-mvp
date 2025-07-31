import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para gerar senha única do Chatwoot
const generateChatwootPassword = (email: string, userId: string): string => {
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    console.log('[Edge] Requisição recebida:', { ...body, password: '***' });

    if (!body.user_id || !body.email || !body.user_name) {
      return new Response(JSON.stringify({ error: 'user_id, email e user_name são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Gerar senha única para o Chatwoot
    const chatwootPassword = generateChatwootPassword(body.email, body.user_id);

    // Gerar nome da instância único
    const userName = body.user_name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const randomStr = Math.random().toString(36).substring(2, 12);
    const instanceName = `${userName}_${randomStr}`;

    console.log('[Edge] Iniciando integração Chatwoot + QR Code');

    // 1. PRIMEIRO: Criar conta no Chatwoot via webhook
    const chatwootPayload = {
      user_name: body.user_name,
      user_id: body.user_id,
      instance_name: instanceName,
      email: body.email,
      password: chatwootPassword,
      plan: body.plan || 'Basic',
      agents_count: body.agents_count || 1
    };

    console.log('[Edge] Chamando webhook do Chatwoot:', { ...chatwootPayload, password: '***' });

    const chatwootResponse = await fetch('https://nwh.suaiden.com/webhook/wootchat', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chatwootPayload),
    });

    if (!chatwootResponse.ok) {
      throw new Error(`Erro na criação da conta Chatwoot: ${chatwootResponse.status}`);
    }

    const chatwootResult = await chatwootResponse.text();
    let accessToken = '';
    
    try {
      const jsonResult = JSON.parse(chatwootResult);
      accessToken = jsonResult.access_token || jsonResult.chatwoot_access_token || '';
    } catch {
      accessToken = chatwootResult;
    }

    console.log('[Edge] Conta Chatwoot criada com sucesso');

    // 2. Salvar dados do Chatwoot no banco
    const { data: chatwootData, error: chatwootError } = await supabase
      .from('chatwoot_accounts')
      .upsert({
        user_id: body.user_id,
        chatwoot_user_name: body.user_name,
        chatwoot_email: body.email,
        chatwoot_password: chatwootPassword,
        chatwoot_access_token: accessToken,
        chatwoot_instance_name: instanceName,
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id' 
      });

    if (chatwootError) {
      console.error('[Edge] Erro ao salvar dados do Chatwoot:', chatwootError);
      return new Response(JSON.stringify({ error: chatwootError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Edge] Dados do Chatwoot salvos com sucesso');

    // 3. DEPOIS: Gerar QR Code via webhook específico
    const qrPayload = {
      user_name: body.user_name,
      user_id: body.user_id,
      instance_name: instanceName,
      email: body.email,
      password: chatwootPassword,
      access_token: accessToken
    };

    console.log('[Edge] Chamando webhook do QR Code...');

    const qrResponse = await fetch('https://nwh.suaiden.com/webhook/gerar_qr_code_whastapp_matriculausa', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(qrPayload),
    });

    if (!qrResponse.ok) {
      throw new Error(`Erro ao gerar QR Code: ${qrResponse.status}`);
    }

    const qrResult = await qrResponse.text();
    let qrCodeData = null;
    
    try {
      const jsonQrResult = JSON.parse(qrResult);
      qrCodeData = jsonQrResult.qrCode || jsonQrResult.base64 || qrResult;
    } catch {
      qrCodeData = qrResult;
    }

    // Validar se o QR code é válido
    if (!qrCodeData || !/^[A-Za-z0-9+/=]+$/.test(qrCodeData) || qrCodeData.length < 100) {
      throw new Error("QR Code inválido ou não encontrado");
    }

    console.log('[Edge] QR Code gerado com sucesso');

    // 4. Salvar dados da conexão WhatsApp
    const { error: whatsappError } = await supabase
      .from('whatsapp_connections')
      .upsert({
        user_id: body.user_id,
        evolution_instance_id: instanceName,
        connection_status: 'connecting',
        qr_code: qrCodeData,
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id' 
      });

    if (whatsappError) {
      console.error('[Edge] Erro ao salvar dados do WhatsApp:', whatsappError);
      return new Response(JSON.stringify({ error: whatsappError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Edge] Dados do WhatsApp salvos com sucesso');

    return new Response(JSON.stringify({ 
      success: true,
      qr_code: qrCodeData,
      instance_name: instanceName,
      chatwoot_access_token: accessToken,
      chatwoot_password: chatwootPassword,
      message: 'Chatwoot e QR Code configurados com sucesso'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Edge] Erro na integração:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Erro interno do servidor',
      details: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 