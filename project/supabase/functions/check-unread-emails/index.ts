import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para descriptografar dados
async function decryptData(encryptedData: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  // Gerar chave de 32 bytes a partir da string
  const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));
  
  // Converter dados criptografados de base64 para Uint8Array
  const encryptedBytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  
  // Extrair IV (primeiros 12 bytes) e dados criptografados
  const iv = encryptedBytes.slice(0, 12);
  const data = encryptedBytes.slice(12);
  
  // Importar chave
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  // Descriptografar
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );
  
  return decoder.decode(decrypted);
}

// Função para renovar access token
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: Deno.env.get('GMAIL_CLIENT_ID') || '',
      client_secret: Deno.env.get('GMAIL_CLIENT_SECRET') || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh access token');
  }

  const data = await response.json();
  return data.access_token;
}

// Função para extrair corpo do email
function extractEmailBody(payload: any): string {
  if (!payload) return '';

  const processPart = (part: any): string => {
    if (part.body?.data) {
      try {
        const decoded = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        return decoded;
      } catch (e) {
        console.error('Error decoding email body:', e);
        return '';
      }
    }
    
    if (part.parts) {
      for (const subPart of part.parts) {
        const result = processPart(subPart);
        if (result) return result;
      }
    }
    
    return '';
  };

  return processPart(payload);
}

// Função para extrair email puro do campo from
function extractEmailFromString(fromString: string): string {
  if (!fromString) return '';
  
  // Padrão para extrair email: "Nome <email@domain.com>" ou apenas "email@domain.com"
  const emailMatch = fromString.match(/<(.+?)>/) || fromString.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  
  if (emailMatch) {
    return emailMatch[1] || emailMatch[0];
  }
  
  return fromString; // Se não conseguir extrair, retorna o original
}

// Função para converter HTML para texto simples
function htmlToText(html: string): string {
  if (!html) return '';
  
  // Remove tags HTML básicas
  let text = html
    .replace(/<[^>]*>/g, ' ') // Remove todas as tags HTML
    .replace(/&nbsp;/g, ' ') // Substitui &nbsp; por espaço
    .replace(/&amp;/g, '&') // Substitui &amp; por &
    .replace(/&lt;/g, '<') // Substitui &lt; por <
    .replace(/&gt;/g, '>') // Substitui &gt; por >
    .replace(/&quot;/g, '"') // Substitui &quot; por "
    .replace(/&#39;/g, "'") // Substitui &#39; por '
    .replace(/\s+/g, ' ') // Múltiplos espaços para um só
    .trim();
  
  return text;
}

// Função para enviar para ngrok
async function sendToN8nEndpoint(emailData: any, connectionEmail: string): Promise<void> {
  try {
    console.log('🚀 sendToN8nEndpoint: ===== FUNCTION STARTED =====');
    console.log('🚀 sendToN8nEndpoint: Email ID:', emailData.id);
    console.log('🚀 sendToN8nEndpoint: Email from:', emailData.from);
    console.log('🚀 sendToN8nEndpoint: Connection email:', connectionEmail);

    const n8nUrl = 'https://nwh.suaiden.com/webhook/47d6d50c-46d1-4b34-9405-de321686dcbc';

    // Extrair domínio do email para identificar universidade
    const emailDomain = emailData.to.split('@')[1]?.toLowerCase() || '';
    
    // Buscar universidade pelo domínio
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { data: universities, error } = await supabase
      .from('universities')
      .select('id, name, contact')
      .or(`contact->>'email'.ilike.%${emailDomain}%,contact->>'admissionsEmail'.ilike.%${emailDomain}%`)
      .limit(1);

    let universityId = 'unknown';
    let universityName = 'Unknown University';
    
    if (!error && universities && universities.length > 0) {
      universityId = universities[0].id;
      universityName = universities[0].name;
    }

    // Buscar user_id da conexão Gmail
    const { data: connections, error: connectionError } = await supabase
      .from('gmail_connections')
      .select('user_id')
      .eq('email', connectionEmail)
      .limit(1);

    let userId = 'unknown';
    if (!connectionError && connections && connections.length > 0) {
      userId = connections[0].user_id;
    }

    console.log('🔍 sendToN8nEndpoint: Connection email:', connectionEmail);
    console.log('🔍 sendToN8nEndpoint: Found user_id:', userId);
    console.log('🔍 sendToN8nEndpoint: Found university_id:', universityId);

    const n8nData = {
      from: extractEmailFromString(emailData.from), // Email puro extraído
      timestamp: emailData.date,
      content: htmlToText(emailData.body || emailData.htmlBody || "Sem conteúdo"), // Sempre texto puro
      subject: emailData.subject,
      client_id: userId, // Usar user_id em vez de university_id
      user_id: userId, // Manter user_id também
      source: 'matricula-usa',
      university_name: universityName,
      university_id: universityId, // Adicionar university_id separadamente
      connection_email: connectionEmail, // Email da conta conectada
      tipo_notif: 'Novo e-mail recebido no inbox'
    };

    console.log('🌐 sendToN8nEndpoint: Sending data to n8n:', JSON.stringify(n8nData, null, 2));

    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MatriculaUSA/1.0',
      },
      body: JSON.stringify(n8nData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ sendToN8nEndpoint: Failed to send to n8n:', errorText);
      console.error('❌ sendToN8nEndpoint: Response status:', response.status);
      console.error('❌ sendToN8nEndpoint: Response headers:', Object.fromEntries(response.headers.entries()));
    } else {
      console.log('✅ sendToN8nEndpoint: Successfully sent to n8n');
      const responseText = await response.text();
      console.log('✅ sendToN8nEndpoint: N8n response:', responseText);
    }
  } catch (error) {
    console.error('❌ sendToNgrokEndpoint: Error sending to ngrok:', error);
    console.error('❌ sendToNgrokEndpoint: Error details:', error.message);
  }
}

// Função principal para verificar emails não lidos
async function checkUnreadEmails(accessToken: string, connectionEmail: string): Promise<void> {
  try {
    console.log('🔍 checkUnreadEmails: Starting to fetch unread emails...');
    
    // Buscar apenas emails não lidos
    const unreadResponse = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&labelIds=UNREAD',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!unreadResponse.ok) {
      console.error('❌ Failed to fetch unread emails:', await unreadResponse.text());
      return;
    }

    const unreadData = await unreadResponse.json();
    console.log('📧 Found unread emails:', unreadData.messages?.length || 0);

    if (!unreadData.messages || unreadData.messages.length === 0) {
      console.log('📧 No unread emails found');
      return;
    }

    // Buscar user_id da conexão Gmail
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { data: connections, error: connectionError } = await supabase
      .from('gmail_connections')
      .select('user_id')
      .eq('email', connectionEmail)
      .limit(1);

    if (connectionError || !connections || connections.length === 0) {
      console.error('❌ Failed to find user for connection:', connectionEmail);
      return;
    }

    const userId = connections[0].user_id;
    console.log('🔍 checkUnreadEmails: Found user_id:', userId);

    // Verificar se este usuário já foi inicializado (para evitar processar e-mails antigos)
    const { data: initStatus, error: initError } = await supabase
      .from('email_processing_initialized')
      .select('id')
      .eq('user_id', userId)
      .eq('connection_email', connectionEmail)
      .single();

    if (initError && initError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('❌ Error checking initialization status:', initError);
      return;
    }

    // Se não foi inicializado, marcar todos os e-mails existentes como processados
    if (!initStatus) {
      console.log('🔄 First time processing for this user. Marking existing emails as processed...');
      
      // Marcar todos os e-mails não lidos existentes como processados
      for (const message of unreadData.messages) {
        await supabase
          .from('processed_emails')
          .insert({
            gmail_message_id: message.id,
            user_id: userId,
            connection_email: connectionEmail,
            status: 'sent',
            payload: { reason: 'initialization' }
          });
      }

      // Marcar usuário como inicializado
      await supabase
        .from('email_processing_initialized')
        .insert({
          user_id: userId,
          connection_email: connectionEmail
        });

      console.log('✅ Initialization completed. All existing unread emails marked as processed.');
      return;
    }

    // Buscar e-mails já processados para este usuário e conexão
    const { data: processedEmails, error: processedError } = await supabase
      .from('processed_emails')
      .select('gmail_message_id')
      .eq('user_id', userId)
      .eq('connection_email', connectionEmail);

    if (processedError) {
      console.error('❌ Error fetching processed emails:', processedError);
      return;
    }

    const processedMessageIds = new Set(processedEmails.map((pe: any) => pe.gmail_message_id));
    console.log('📊 Processed emails count:', processedMessageIds.size);

    // Filtrar apenas e-mails não processados
    const newEmails = unreadData.messages.filter((message: any) => !processedMessageIds.has(message.id));
    console.log('📧 New unprocessed emails:', newEmails.length);

    if (newEmails.length === 0) {
      console.log('📧 No new emails to process');
      return;
    }

    // Processar apenas o primeiro novo e-mail (evitar envio em massa)
    const messageToProcess = newEmails[0];
    console.log('📧 Processing first new email:', messageToProcess.id);

    // Processar apenas o primeiro novo e-mail
    try {
      console.log('📧 Processing new email:', messageToProcess.id);
      
      // Buscar detalhes do email
      const detailResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageToProcess.id}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!detailResponse.ok) {
        console.error('❌ Failed to fetch email details:', messageToProcess.id);
        return;
      }

      const detail = await detailResponse.json();
      
      // Extrair informações básicas do email
      const headers = detail.payload?.headers || [];
      const from = headers.find((h: any) => h.name === 'From')?.value || '';
      const to = headers.find((h: any) => h.name === 'To')?.value || '';
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
      const date = headers.find((h: any) => h.name === 'Date')?.value || '';
      
      // Extrair corpo do email
      const emailBody = extractEmailBody(detail.payload);
      
      const emailData = {
        id: messageToProcess.id,
        threadId: messageToProcess.threadId,
        from: from,
        to: to,
        subject: subject,
        body: emailBody,
        date: new Date(date).toLocaleString(),
        isRead: false // Sempre false pois são emails não lidos
      };

      console.log('📧 New email details:', {
        id: emailData.id,
        from: emailData.from,
        subject: emailData.subject
      });

      // Enviar para n8n
      await sendToN8nEndpoint(emailData, connectionEmail);
      console.log('✅ New email sent to n8n:', emailData.id);

      // Marcar como processado
      await supabase
        .from('processed_emails')
        .insert({
          gmail_message_id: emailData.id,
          user_id: userId,
          connection_email: connectionEmail,
          status: 'sent',
          payload: { sent_to_n8n: true }
        });

      console.log('✅ Email marked as processed in database');
      
    } catch (error) {
      console.error('❌ Error processing new email:', messageToProcess.id, error);
      
      // Marcar como erro
      await supabase
        .from('processed_emails')
        .insert({
          gmail_message_id: messageToProcess.id,
          user_id: userId,
          connection_email: connectionEmail,
          status: 'error',
          error_message: error.message
        });
    }
    
    console.log('✅ checkUnreadEmails: Completed');
  } catch (error) {
    console.error('❌ Error in checkUnreadEmails:', error);
  }
}

Deno.serve(async (req) => {
  console.log('📧 check-unread-emails: ===== FUNCTION CALLED =====');
  console.log('📧 check-unread-emails: Request method:', req.method);
  console.log('📧 check-unread-emails: Request URL:', req.url);
  
  if (req.method === 'OPTIONS') {
    console.log('📧 check-unread-emails: OPTIONS request, returning CORS headers');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verificar se é um token válido do Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar conexão Gmail do usuário
    const url = new URL(req.url);
    const email = url.searchParams.get('email');
    
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email parameter required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🔍 Searching for Gmail connection:', email);

    const { data: connections, error: connectionError } = await supabase
      .from('gmail_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('email', email)
      .limit(1);

    if (connectionError || !connections || connections.length === 0) {
      return new Response(JSON.stringify({ error: 'Gmail connection not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const connection = connections[0];
    console.log('✅ Found Gmail connection:', connection.email);

    // Verificar se tem access token
    if (!connection.access_token) {
      return new Response(JSON.stringify({ error: 'No access token found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Descriptografar access token
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY') || 'default-key-change-in-production';
    let accessToken = await decryptData(connection.access_token, encryptionKey);

    // Verificar se o token expirou
    const expiresAt = new Date(connection.expires_at);
    const now = new Date();

    if (now >= expiresAt) {
      console.log('🔄 Access token expired, refreshing...');
      
      // Descriptografar refresh token
      const refreshToken = await decryptData(connection.refresh_token!, encryptionKey);
      
      // Renovar access token
      accessToken = await refreshAccessToken(refreshToken);
      
      // Atualizar token no banco
      const newExpiresAt = new Date();
      newExpiresAt.setHours(newExpiresAt.getHours() + 1); // Tokens duram 1 hora
      
      await supabase
        .from('gmail_connections')
        .update({
          access_token: accessToken,
          expires_at: newExpiresAt.toISOString()
        })
        .eq('id', connection.id);
      
      console.log('✅ Access token refreshed successfully');
    }

    // Verificar emails não lidos e enviar para ngrok
    await checkUnreadEmails(accessToken, connection.email);

    return new Response(JSON.stringify({
      success: true,
      message: 'Unread emails check completed'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in check-unread-emails:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 