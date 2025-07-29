import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para descriptografar dados
async function decryptData(encryptedData: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const keyBuffer = encoder.encode(key);
  
  const combined = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  const derivedKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('supabase-email'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    derivedKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    encrypted
  );
  
  return decoder.decode(decrypted);
}

// Função para renovar access token usando refresh token
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Token refresh failed:', errorText);
    throw new Error('Failed to refresh access token');
  }

  const data = await response.json();
  return data.access_token;
}

// Função para decodificar conteúdo base64 com encoding correto
function decodeBase64WithEncoding(base64Data: string, encoding: string = 'UTF-8'): string {
  try {
    const normalizedData = base64Data.replace(/-/g, '+').replace(/_/g, '/');
    const paddedData = normalizedData + '='.repeat((4 - normalizedData.length % 4) % 4);
    const binaryString = atob(paddedData);
    
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const decoder = new TextDecoder(encoding);
    return decoder.decode(bytes);
  } catch (e) {
    console.error('Error decoding base64 with encoding:', encoding, e);
    try {
      const normalizedData = base64Data.replace(/-/g, '+').replace(/_/g, '/');
      const paddedData = normalizedData + '='.repeat((4 - normalizedData.length % 4) % 4);
      return atob(paddedData);
    } catch (fallbackError) {
      console.error('Fallback decoding also failed:', fallbackError);
      return '';
    }
  }
}

// Função para extrair o conteúdo completo do email
function extractEmailBody(payload: any): string {
  if (!payload) return '';

  const processPart = (part: any): string => {
    if (!part.body?.data) return '';
    
    let encoding = 'UTF-8';
    if (part.headers) {
      const contentType = part.headers.find((h: any) => h.name === 'Content-Type')?.value || '';
      const charsetMatch = contentType.match(/charset=([^;]+)/i);
      if (charsetMatch) {
        encoding = charsetMatch[1].toUpperCase();
        if (encoding === 'ISO-8859-1' || encoding === 'LATIN1') encoding = 'ISO-8859-1';
        else if (encoding === 'WINDOWS-1252') encoding = 'WINDOWS-1252';
        else if (encoding === 'UTF-8' || encoding === 'UTF8') encoding = 'UTF-8';
        else if (encoding === 'ASCII') encoding = 'UTF-8';
        else encoding = 'UTF-8';
      }
    }
    
    try {
      return decodeBase64WithEncoding(part.body.data, encoding);
    } catch (e) {
      return decodeBase64WithEncoding(part.body.data, 'UTF-8');
    }
  };

  if (payload.parts && payload.parts.length > 0) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html') {
        const content = processPart(part);
        if (content) return content;
      }
    }
    
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain') {
        const content = processPart(part);
        if (content) return content;
      }
    }
  }

  if (payload.body?.data) {
    let encoding = 'UTF-8';
    if (payload.headers) {
      const contentType = payload.headers.find((h: any) => h.name === 'Content-Type')?.value || '';
      const charsetMatch = contentType.match(/charset=([^;]+)/i);
      if (charsetMatch) {
        encoding = charsetMatch[1].toUpperCase();
        if (encoding === 'ISO-8859-1') encoding = 'ISO-8859-1';
        else if (encoding === 'WINDOWS-1252') encoding = 'WINDOWS-1252';
        else if (encoding === 'LATIN1') encoding = 'ISO-8859-1';
      }
    }
    
    try {
      return decodeBase64WithEncoding(payload.body.data, encoding);
    } catch (e) {
      return decodeBase64WithEncoding(payload.body.data, 'UTF-8');
    }
  }

  return '';
}

// Função para decodificar headers de email
function decodeHeader(value: string): string {
  if (!value) return '';
  
  const encodedMatch = value.match(/=\?([^?]+)\?([BQ])\?([^?]+)\?=/);
  if (encodedMatch) {
    const [, charset, encoding, data] = encodedMatch;
    try {
      if (encoding === 'B') {
        return decodeBase64WithEncoding(data, charset.toUpperCase());
      } else if (encoding === 'Q') {
        let decoded = data.replace(/=([0-9A-F]{2})/gi, (match: string, hex: string) => {
          return String.fromCharCode(parseInt(hex, 16));
        });
        decoded = decoded.replace(/_/g, ' ');
        return decoded;
      }
    } catch (e) {
      console.error('Error decoding header:', e);
      return value;
    }
  }
  
  return value;
}

// Função para enviar e-mail para o endpoint n8n
async function sendEmailToN8n(emailData: any, connectionEmail: string): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      tipo_notf: 'Novo e-mail recebido',
      email_origem: connectionEmail,
      email_de: emailData.from,
      email_para: emailData.to,
      assunto: emailData.subject,
      conteudo: emailData.body,
      data_recebimento: emailData.date,
      gmail_message_id: emailData.id,
      tem_anexos: emailData.hasAttachments,
      anexos: emailData.attachments || []
    };

    console.log('📤 ===== ENVIANDO E-MAIL PARA N8N =====');
    console.log('📤 E-mail ID:', emailData.id);
    console.log('📤 De:', emailData.from);
    console.log('📤 Para:', emailData.to);
    console.log('📤 Assunto:', emailData.subject);
    console.log('📤 Data:', emailData.date);
    console.log('📤 Tem anexos:', emailData.hasAttachments);
    console.log('📤 Endpoint n8n:', 'https://nwh.suaiden.com/webhook/47d6d50c-46d1-4b34-9405-de321686dcbc');

    const response = await fetch('https://nwh.suaiden.com/webhook/47d6d50c-46d1-4b34-9405-de321686dcbc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MatriculaUSA-EmailProcessor/1.0',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro ao enviar para n8n:', response.status, errorText);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const responseText = await response.text();
    console.log('✅ E-mail enviado com sucesso para n8n:', response.status, responseText);
    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao enviar e-mail para n8n:', error);
    return { success: false, error: error.message };
  }
}

// Função para registrar e-mail como processado
async function markEmailAsProcessed(
  supabase: any,
  gmailMessageId: string,
  userId: string,
  connectionEmail: string,
  status: 'sent' | 'error',
  payload?: any,
  errorMessage?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('processed_emails')
      .insert({
        gmail_message_id: gmailMessageId,
        user_id: userId,
        connection_email: connectionEmail,
        status: status,
        payload: payload,
        error_message: errorMessage
      });

    if (error) {
      console.error('❌ Erro ao registrar e-mail como processado:', error);
      throw error;
    }

    console.log('✅ E-mail registrado como processado:', gmailMessageId, status);
  } catch (error) {
    console.error('❌ Erro crítico ao registrar e-mail processado:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  console.log('📧 process-new-emails: ===== FUNCTION CALLED =====');
  console.log('📧 process-new-emails: Method:', req.method);
  console.log('📧 process-new-emails: URL:', req.url);
  console.log('📧 process-new-emails: Headers:', Object.fromEntries(req.headers.entries()));
  
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { maxResults = 10, targetEmail } = await req.json();
    
    console.log('📨 Request parameters:', { maxResults, targetEmail, userId: user.id });

    // Buscar conexão Gmail do usuário
    let dbQuery = supabase
      .from('email_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google');
    
    if (targetEmail) {
      dbQuery = dbQuery.eq('email', targetEmail);
    }
    
    const { data: connection, error: connectionError } = await dbQuery.single();

    if (connectionError || !connection) {
      console.log('❌ Connection not found or error:', connectionError);
      return new Response(JSON.stringify({ error: 'Gmail not connected. Please connect your Gmail account first.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar se o token expirou e renovar se necessário
    const now = new Date();
    const expiresAt = new Date(connection.expires_at);
    let accessToken = connection.access_token;

    if (now >= expiresAt) {
      console.log('🔄 Access token expired, refreshing...');
      
      const encryptionKey = Deno.env.get('ENCRYPTION_KEY') || 'default-key-change-in-production';
      const refreshToken = await decryptData(connection.refresh_token!, encryptionKey);
      
      accessToken = await refreshAccessToken(refreshToken);
      
      const newExpiresAt = new Date();
      newExpiresAt.setHours(newExpiresAt.getHours() + 1);
      
      await supabase
        .from('email_connections')
        .update({
          access_token: accessToken,
          expires_at: newExpiresAt.toISOString()
        })
        .eq('id', connection.id);
      
      console.log('✅ Access token refreshed successfully');
    }

    // Buscar e-mails não lidos do Gmail
    const params = new URLSearchParams({
      maxResults: maxResults.toString(),
      labelIds: 'UNREAD',
    });

    const gmailResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!gmailResponse.ok) {
      const errorText = await gmailResponse.text();
      console.error('❌ Gmail API error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to fetch emails from Gmail' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const gmailData = await gmailResponse.json();
    const unreadEmails = gmailData.messages || [];

    console.log('📊 E-mails não lidos encontrados:', unreadEmails.length);

    if (unreadEmails.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No new unread emails found',
        processed: 0,
        skipped: 0
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar se este usuário já foi inicializado (para evitar processar e-mails antigos)
    const { data: initStatus, error: initError } = await supabase
      .from('email_processing_initialized')
      .select('id')
      .eq('user_id', user.id)
      .eq('connection_email', connection.email)
      .single();

    if (initError && initError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('❌ Erro ao verificar status de inicialização:', initError);
      return new Response(JSON.stringify({ error: 'Failed to check initialization status' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Se não foi inicializado, marcar todos os e-mails não lidos existentes como processados
    if (!initStatus) {
      console.log('🔄 Primeira execução para este usuário. Marcando e-mails existentes como processados...');
      
      // Buscar todos os e-mails não lidos existentes
      const existingUnreadResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=500&labelIds=UNREAD`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (existingUnreadResponse.ok) {
        const existingUnreadData = await existingUnreadResponse.json();
        const existingUnreadEmails = existingUnreadData.messages || [];
        
        console.log(`📊 Encontrados ${existingUnreadEmails.length} e-mails não lidos existentes para marcar como processados`);
        
        // Marcar todos os e-mails existentes como processados (sem enviar para n8n)
        for (const email of existingUnreadEmails) {
          try {
            await supabase
              .from('processed_emails')
              .insert({
                gmail_message_id: email.id,
                user_id: user.id,
                connection_email: connection.email,
                status: 'sent', // Marcar como enviado para não processar novamente
                payload: { 
                  note: 'Marked as processed during initialization - existing email not sent to n8n',
                  initialized_at: new Date().toISOString()
                }
              });
          } catch (error) {
            // Ignorar erros de duplicidade (caso já exista)
            console.log(`ℹ️ E-mail ${email.id} já estava marcado como processado`);
          }
        }
        
        // Marcar usuário como inicializado
        await supabase
          .from('email_processing_initialized')
          .insert({
            user_id: user.id,
            connection_email: connection.email
          });
        
        console.log('✅ Usuário inicializado. E-mails existentes marcados como processados.');
      }
    }

    // Buscar e-mails já processados para este usuário e conexão
    const { data: processedEmails, error: processedError } = await supabase
      .from('processed_emails')
      .select('gmail_message_id')
      .eq('user_id', user.id)
      .eq('connection_email', connection.email);

    if (processedError) {
      console.error('❌ Erro ao buscar e-mails processados:', processedError);
      return new Response(JSON.stringify({ error: 'Failed to check processed emails' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const processedMessageIds = new Set(processedEmails.map((pe: any) => pe.gmail_message_id));
    console.log('📊 E-mails já processados:', processedMessageIds.size);

    // Filtrar apenas e-mails não processados
    const newEmails = unreadEmails.filter((email: any) => !processedMessageIds.has(email.id));
    console.log('📊 E-mails novos (não processados):', newEmails.length);

    if (newEmails.length === 0) {
      const message = !initStatus 
        ? 'Initialization completed. All existing unread emails marked as processed. Only new emails will be sent to n8n.'
        : 'All unread emails have already been processed';
      
      return new Response(JSON.stringify({
        success: true,
        message: message,
        processed: 0,
        skipped: unreadEmails.length,
        initialized: !initStatus
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Processar apenas o primeiro e-mail novo (controle de taxa)
    const emailToProcess = newEmails[0];
    console.log('📧 Processando e-mail:', emailToProcess.id);

    // Buscar detalhes completos do e-mail
    const detailResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailToProcess.id}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!detailResponse.ok) {
      console.error('❌ Failed to fetch email details:', emailToProcess.id);
      return new Response(JSON.stringify({ error: 'Failed to fetch email details' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const detail = await detailResponse.json();

    // Extrair informações do e-mail
    const headers = detail.payload?.headers || [];
    const from = decodeHeader(headers.find((h: any) => h.name === 'From')?.value || 'Unknown');
    const to = decodeHeader(headers.find((h: any) => h.name === 'To')?.value || '');
    const subject = decodeHeader(headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject');
    const date = headers.find((h: any) => h.name === 'Date')?.value || new Date().toISOString();

    // Extrair anexos
    const attachments: any[] = [];
    if (detail.payload?.parts) {
      for (const part of detail.payload.parts) {
        if (part.filename && part.body?.attachmentId) {
          attachments.push({
            id: part.body.attachmentId,
            filename: part.filename,
            mimeType: part.mimeType || 'application/octet-stream',
            size: part.body.size || 0,
            attachmentId: part.body.attachmentId
          });
        }
      }
    } else if (detail.payload?.body?.attachmentId && detail.payload.filename) {
      attachments.push({
        id: detail.payload.body.attachmentId,
        filename: detail.payload.filename,
        mimeType: detail.payload.mimeType || 'application/octet-stream',
        size: detail.payload.body.size || 0,
        attachmentId: detail.payload.body.attachmentId
      });
    }

    // Extrair corpo do e-mail
    const emailBody = extractEmailBody(detail.payload);

    const emailData = {
      id: emailToProcess.id,
      threadId: emailToProcess.threadId,
      from: from,
      to: to,
      subject: subject,
      snippet: detail.snippet || '',
      body: emailBody,
      date: new Date(date).toLocaleString(),
      hasAttachments: attachments.length > 0,
      attachments: attachments
    };

    // Enviar e-mail para o n8n
    const sendResult = await sendEmailToN8n(emailData, connection.email);

    if (sendResult.success) {
      // Registrar como processado com sucesso
      await markEmailAsProcessed(
        supabase,
        emailToProcess.id,
        user.id,
        connection.email,
        'sent',
        emailData
      );

      console.log('✅ E-mail processado e enviado com sucesso:', emailToProcess.id);

      return new Response(JSON.stringify({
        success: true,
        message: 'Email processed and sent successfully',
        processed: 1,
        skipped: newEmails.length - 1,
        email: {
          id: emailToProcess.id,
          subject: emailData.subject,
          from: emailData.from,
          date: emailData.date
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Registrar como erro
      await markEmailAsProcessed(
        supabase,
        emailToProcess.id,
        user.id,
        connection.email,
        'error',
        emailData,
        sendResult.error
      );

      console.error('❌ Erro ao processar e-mail:', emailToProcess.id, sendResult.error);

      return new Response(JSON.stringify({
        success: false,
        message: 'Failed to send email to n8n',
        error: sendResult.error,
        processed: 0,
        skipped: newEmails.length - 1
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('❌ Error in process-new-emails:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 