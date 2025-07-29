import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função auxiliar para decodificar o payload do Pub/Sub
function decodeWebhookData(body: any) {
  if (body?.message?.data) {
    const decodedData = atob(body.message.data);
    return JSON.parse(decodedData);
  }
  throw new Error("Invalid Pub/Sub message format");
}

// Função para extrair o email do header 'From'
function getSenderEmail(headers: any[]): string | null {
  const fromHeader = headers.find(h => h.name.toLowerCase() === 'from');
  if (fromHeader && fromHeader.value) {
    const match = fromHeader.value.match(/<(.+)>/);
    return match ? match[1] : fromHeader.value;
  }
  return null;
}

// Função para extrair emails destinatários dos headers
function getRecipientEmails(headers: any[]): string[] {
  const recipients: string[] = [];
  
  // Buscar no header 'To'
  const toHeader = headers.find(h => h.name.toLowerCase() === 'to');
  if (toHeader && toHeader.value) {
    const emails = toHeader.value.match(/<(.+?)>/g);
    if (emails) {
      emails.forEach(email => recipients.push(email.slice(1, -1)));
    } else {
      // Se não tem <>, pega o email direto
      recipients.push(toHeader.value);
    }
  }
  
  // Buscar no header 'Cc'
  const ccHeader = headers.find(h => h.name.toLowerCase() === 'cc');
  if (ccHeader && ccHeader.value) {
    const emails = ccHeader.value.match(/<(.+?)>/g);
    if (emails) {
      emails.forEach(email => recipients.push(email.slice(1, -1)));
    } else {
      recipients.push(ccHeader.value);
    }
  }
  
  return recipients;
}

// Função para renovar token do Gmail
async function refreshGmailToken(refreshToken: string): Promise<any> {
  console.log('🔄 refreshGmailToken: Renovando token...');
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
  }

  const tokenData = await response.json();
  console.log('✅ refreshGmailToken: Token renovado com sucesso');
  return tokenData;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('📧 process-inbox-email: ===== WEBHOOK RECEIVED =====');
    
    const body = await req.json();
    const { emailAddress, historyId } = decodeWebhookData(body);

    console.log(`📧 Notificação recebida para ${emailAddress} com historyId: ${historyId}`);
    console.log(`📧 emailAddress (destinatário): ${emailAddress}`);

    // Inicialize o cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ===== 1. DEDUPLICAÇÃO =====
    // Tenta inserir o historyId na tabela. Se já existir, a constraint UNIQUE falhará.
    const { error: insertError } = await supabaseClient
      .from('processed_notifications')
      .insert({ history_id: historyId, email_address: emailAddress });

    if (insertError) {
      // O erro 23505 (unique_violation) é esperado e significa que a notificação é duplicada.
      if (insertError.code === '23505') {
        console.log(`🟡 Notificação duplicada (historyId: ${historyId}). Ignorando.`);
        return new Response("OK (Duplicate)", { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      // Outro erro de banco de dados é um problema real.
      throw new Error(`Erro ao inserir no log de notificações: ${insertError.message}`);
    }

    // ===== 2. VALIDAR CONEXÃO DO EMAIL DESTINATÁRIO =====
    // O emailAddress é o DESTINATÁRIO (que deve estar na tabela email_connections)
    const { data: connection, error: connectionError } = await supabaseClient
      .from('email_connections')
      .select('id, user_id, access_token, refresh_token, expires_at, last_history_id')
      .eq('email', emailAddress) // emailAddress é o destinatário
      .eq('provider', 'google')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (connectionError || !connection) {
      console.warn(`⚠️ Email destinatário não conectado no sistema: ${emailAddress}. Notificação descartada.`);
      // Retorna 200 para o Google não tentar reenviar.
      return new Response("OK (Email not configured)", { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Conexão encontrada para destinatário: ${emailAddress}`);
    console.log(`📊 Último historyId processado: ${connection.last_history_id || 'Nenhum'}`);

    // ===== 3. VERIFICAR E RENOVAR TOKEN SE NECESSÁRIO =====
    let accessToken = connection.access_token;
    const expiresAt = new Date(connection.expires_at);
    const now = new Date();
    
    if (expiresAt <= now) {
      console.log('🔄 Token expirado, renovando...');
      const refreshResult = await refreshGmailToken(connection.refresh_token);
      accessToken = refreshResult.access_token;
      
      // Atualizar token no banco
      await supabaseClient
        .from('email_connections')
        .update({
          access_token: refreshResult.access_token,
          refresh_token: refreshResult.refresh_token,
          expires_at: new Date(Date.now() + refreshResult.expires_in * 1000).toISOString()
        })
        .eq('email', emailAddress)
        .eq('provider', 'google');
    }

    // ===== 4. VERIFICAR SE É PRIMEIRA EXECUÇÃO (INICIALIZAÇÃO) =====
    if (!connection.last_history_id) {
      console.log('🌱 Primeira execução detectada - Iniciando processo de bootstrap...');
      
      // Buscar o historyId atual da caixa de entrada
      const profileResponse = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/profile',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!profileResponse.ok) {
        const errorText = await profileResponse.text();
        throw new Error(`Gmail profile API error: ${profileResponse.status} - ${errorText}`);
      }

      const profileData = await profileResponse.json();
      const initialHistoryId = profileData.historyId;
      
      console.log(`🌱 HistoryId atual da caixa de entrada: ${initialHistoryId}`);
      
      // Salvar o historyId inicial no banco
      await supabaseClient
        .from('email_connections')
        .update({ last_history_id: initialHistoryId })
        .eq('email', emailAddress)
        .eq('provider', 'google');
      
      console.log(`🌱 Primeira sincronização: historyId inicial ${initialHistoryId} salvo para ${emailAddress}`);
      
      // Encerrar a execução - inicialização concluída
      return new Response("OK (Bootstrap completed)", { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ===== 5. PROCESSAMENTO NORMAL (NÃO É PRIMEIRA EXECUÇÃO) =====
    console.log('🔍 Execução normal - Buscando emails novos usando historyId controlado...');
    
    // Usar o last_history_id do banco
    const startHistoryId = connection.last_history_id;
    console.log(`🔍 Usando startHistoryId: ${startHistoryId}`);

    const historyResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${startHistoryId}&historyTypes=messageAdded`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!historyResponse.ok) {
      const errorText = await historyResponse.text();
      throw new Error(`Gmail API error: ${historyResponse.status} - ${errorText}`);
    }

    const historyData = await historyResponse.json();
    console.log('DEBUG: Resposta completa do History API:', JSON.stringify(historyData, null, 2));
    
    const messagesAdded = historyData.history?.flatMap((h: any) => h.messagesAdded || []) || [];
    
    if (messagesAdded.length === 0) {
      console.log("ℹ️ Nenhum email novo encontrado para este historyId.");
      return new Response("OK (No new messages)", { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📧 Encontrados ${messagesAdded.length} emails novos`);

    // ===== 6. ATUALIZAR LAST_HISTORY_ID NO BANCO =====
    if (historyData.historyId) {
      console.log(`📊 Atualizando last_history_id para: ${historyData.historyId}`);
      await supabaseClient
        .from('email_connections')
        .update({ last_history_id: historyData.historyId })
        .eq('email', emailAddress)
        .eq('provider', 'google');
    }

    // ===== 7. PROCESSAR CADA MENSAGEM =====
    for (const item of messagesAdded) {
      if (!item.message?.id) continue;

      console.log(`📧 Processando mensagem ID: ${item.message.id}`);

      const messageResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.message.id}?format=full`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!messageResponse.ok) {
        console.error('❌ Failed to fetch message details:', item.message.id);
        continue;
      }

      const messageDetails = await messageResponse.json();
      const headers = messageDetails.payload?.headers;
      if (!headers) continue;

      // ===== 7. IDENTIFICAR UNIVERSIDADE PELO DESTINATÁRIO =====
      // CORREÇÃO: Usar o emailAddress (destinatário) em vez do remetente
      const recipientDomain = emailAddress.split('@')[1];
      console.log(`🎓 Buscando universidade pelo domínio do destinatário: ${recipientDomain}`);

      const { data: university, error: uniError } = await supabaseClient
        .from('universities')
        .select('id, name, contact')
        .or(`contact->>'email'.ilike.%${recipientDomain}%,contact->>'admissionsEmail'.ilike.%${recipientDomain}%`)
        .limit(1)
        .single();
      
      if (uniError || !university) {
        console.warn(`🎓 Nenhuma universidade encontrada para o domínio do destinatário: ${recipientDomain}`);
        console.log(`📧 Continuando processamento mesmo sem universidade identificada...`);
      } else {
        console.log(`✅ Email destinado para ${emailAddress} associado à universidade ${university.name}`);
      }

      // ===== 8. ENVIAR PARA O N8N =====
      const n8nWebhookUrl = 'https://nwh.suaiden.com/webhook/47d6d50c-46d1-4b34-9405-de321686dcbc';
      
      // Função para decodificar corretamente o corpo do email com UTF-8
      const decodeEmailBody = (base64Data: string): string => {
        const binaryString = atob(base64Data.replace(/-/g, '+').replace(/_/g, '/'));
        const bytes = Uint8Array.from(binaryString, char => char.charCodeAt(0));
        return new TextDecoder('utf-8').decode(bytes);
      };
      
      // Extrair dados do email
      const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
      
      // Extrair corpo do email com encoding correto
      let body = '';
      let htmlBody = '';
      
      if (messageDetails.payload?.body?.data) {
        body = decodeEmailBody(messageDetails.payload.body.data);
      } else if (messageDetails.payload?.parts) {
        for (const part of messageDetails.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            body = decodeEmailBody(part.body.data);
          } else if (part.mimeType === 'text/html' && part.body?.data) {
            htmlBody = decodeEmailBody(part.body.data);
          }
        }
      }

      // Extrair anexos
      const attachments: Array<{filename: string, contentType: string, size: number}> = [];
      if (messageDetails.payload?.parts) {
        for (const part of messageDetails.payload.parts) {
          if (part.filename && part.body?.attachmentId) {
            attachments.push({
              filename: part.filename,
              contentType: part.mimeType,
              size: part.body.size || 0
            });
          }
        }
      }

      // Payload final simplificado para o n8n
      const payloadFinalN8n = {
        userId: connection.user_id,
        content: body, // Agora com o encoding correto
        from: getHeader('from'),
        subject: getHeader('subject'),
        timestamp: new Date(parseInt(messageDetails.internalDate)).toISOString()
      };

      try {
        console.log('📤 Enviando para n8n...');
        const n8nResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadFinalN8n)
        });

        if (!n8nResponse.ok) {
          console.error('❌ Failed to send to n8n:', n8nResponse.status, n8nResponse.statusText);
        } else {
          console.log('✅ Email enviado para n8n com sucesso');
        }
      } catch (error) {
        console.error('❌ Error sending to n8n:', error);
      }
    }

    console.log("✅ Processo concluído com sucesso.");
    return new Response("OK", { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ ===== ERRO GERAL NO PROCESSAMENTO ===== ❌');
    console.error(error);
    // Retorna 200 mesmo em caso de erro para evitar retries do Pub/Sub
    // O erro já foi logado para que você possa depurá-lo.
    return new Response("OK (Error handled)", { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}); 