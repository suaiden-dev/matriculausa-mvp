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
  
  // Decodifica base64
  const combined = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));
  
  // Separa IV e dados
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



// Função para registrar email como processado (simplificada)
async function markEmailAsProcessed(emailData: any, connectionEmail: string): Promise<void> {
  try {
    console.log('✅ Email processed successfully:', emailData.id);
  } catch (error) {
    console.error('❌ Error in markEmailAsProcessed:', error);
  }
}



// Função para decodificar conteúdo base64 com encoding correto
function decodeBase64WithEncoding(base64Data: string, encoding: string = 'UTF-8'): string {
  try {
    // Substituir caracteres URL-safe (Base64URL para Base64 padrão)
    const normalizedData = base64Data.replace(/-/g, '+').replace(/_/g, '/');
    
    // Adicionar padding se necessário
    const paddedData = normalizedData + '='.repeat((4 - normalizedData.length % 4) % 4);
    
    // Decodificar base64
    const binaryString = atob(paddedData);
    
    // Converter para Uint8Array
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Decodificar com encoding específico
    const decoder = new TextDecoder(encoding);
    return decoder.decode(bytes);
  } catch (e) {
    console.error('Error decoding base64 with encoding:', encoding, e);
    // Fallback para UTF-8
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

// Função para decodificar quoted-printable
function decodeQuotedPrintable(data: string, encoding: string = 'UTF-8'): string {
  try {
    // Substituir sequências quoted-printable
    let decoded = data.replace(/=([0-9A-F]{2})/gi, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });
    
    // Substituir underscores por espaços (quoted-printable)
    decoded = decoded.replace(/_/g, ' ');
    
    // Decodificar com encoding específico
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      bytes[i] = decoded.charCodeAt(i);
    }
    
    const decoder = new TextDecoder(encoding);
    return decoder.decode(bytes);
  } catch (e) {
    console.error('Error decoding quoted-printable with encoding:', encoding, e);
    return data;
  }
}

// Função para extrair o conteúdo completo do email
function extractEmailBody(payload: any): string {
  if (!payload) return '';

  // Função auxiliar para processar parte do email
  const processPart = (part: any): string => {
    if (!part.body?.data) return '';
    
    // Detectar encoding do Content-Type
    let encoding = 'UTF-8';
    if (part.headers) {
      const contentType = part.headers.find((h: any) => h.name === 'Content-Type')?.value || '';
      const charsetMatch = contentType.match(/charset=([^;]+)/i);
      if (charsetMatch) {
        encoding = charsetMatch[1].toUpperCase();
        // Normalizar encodings comuns para português
        if (encoding === 'ISO-8859-1' || encoding === 'LATIN1') encoding = 'ISO-8859-1';
        else if (encoding === 'WINDOWS-1252') encoding = 'WINDOWS-1252';
        else if (encoding === 'UTF-8' || encoding === 'UTF8') encoding = 'UTF-8';
        else if (encoding === 'ASCII') encoding = 'UTF-8';
        else {
          console.log('Unknown encoding detected:', encoding, 'falling back to UTF-8');
          encoding = 'UTF-8';
        }
      }
    }
    
    try {
      const decoded = decodeBase64WithEncoding(part.body.data, encoding);
      console.log(`Successfully decoded part with encoding: ${encoding}`);
      return decoded;
    } catch (e) {
      console.error('Error processing part with encoding:', encoding, e);
      // Tentar com UTF-8 como fallback
      try {
        const fallbackDecoded = decodeBase64WithEncoding(part.body.data, 'UTF-8');
        console.log('Fallback to UTF-8 successful');
        return fallbackDecoded;
      } catch (fallbackError) {
        console.error('UTF-8 fallback also failed:', fallbackError);
        return '';
      }
    }
  };

  // Se tem parts, processar cada parte
  if (payload.parts && payload.parts.length > 0) {
    // Primeiro, procurar por HTML para manter formatação
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html') {
        const content = processPart(part);
        if (content) return content;
      }
    }
    
    // Se não encontrou HTML, procurar texto simples
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain') {
        const content = processPart(part);
        if (content) return content;
      }
    }
  }

  // Se não tem parts, verificar se o payload tem dados diretamente
  if (payload.body?.data) {
    // Detectar encoding do Content-Type
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
      console.error('Error processing payload body with encoding:', encoding, e);
      return decodeBase64WithEncoding(payload.body.data, 'UTF-8');
    }
  }

  return '';
}

interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
}

interface Email {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  body: string; // Conteúdo completo do email
  htmlBody?: string;
  date: string;
  isRead: boolean;
  hasAttachments: boolean;
  attachments?: EmailAttachment[];
  priority: 'high' | 'normal' | 'low';
  labels: string[];
}

Deno.serve(async (req) => {
  console.log('📧 get-gmail-inbox: ===== FUNCTION CALLED =====');
  console.log('📧 get-gmail-inbox: Request method:', req.method);
  console.log('📧 get-gmail-inbox: Request URL:', req.url);
  
  if (req.method === 'OPTIONS') {
    console.log('📧 get-gmail-inbox: OPTIONS request, returning CORS headers');
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

    const { maxResults = 50, labelIds = ['INBOX'], query = '', countOnly = false, pageToken } = await req.json();
    
    // Extrair email da conta específica (opcional)
    const url = new URL(req.url);
    const targetEmail = url.searchParams.get('email');
    
    console.log('📨 Request parameters:', { maxResults, labelIds, query, countOnly, pageToken, targetEmail });

    // Buscar conexão Gmail do usuário (específica ou primeira)
    let dbQuery = supabase
      .from('email_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google');
    
    if (targetEmail) {
      dbQuery = dbQuery.eq('email', targetEmail);
      console.log('🔍 Searching for specific email connection:', targetEmail);
    } else {
      console.log('🔍 Searching for any email connection for user:', user.id);
    }
    
    const { data: connection, error: connectionError } = await dbQuery.single();

    console.log('🔍 Database query result:', {
      connection: connection ? { id: connection.id, email: connection.email, hasAccessToken: !!connection.access_token } : null,
      error: connectionError,
      targetEmail,
      userId: user.id
    });

    if (connectionError || !connection) {
      console.log('❌ Connection not found or error:', connectionError);
      return new Response(JSON.stringify({ error: 'Gmail not connected. Please connect your Gmail account first.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar se o token expirou
    const now = new Date();
    const expiresAt = new Date(connection.expires_at);
    let accessToken = connection.access_token;

    if (now >= expiresAt) {
      console.log('🔄 Access token expired, refreshing...');
      
      // Descriptografar refresh token
      const encryptionKey = Deno.env.get('ENCRYPTION_KEY') || 'default-key-change-in-production';
      const refreshToken = await decryptData(connection.refresh_token!, encryptionKey);
      
      // Renovar access token
      accessToken = await refreshAccessToken(refreshToken);
      
      // Atualizar token no banco
      const newExpiresAt = new Date();
      newExpiresAt.setHours(newExpiresAt.getHours() + 1); // Tokens duram 1 hora
      
      await supabase
        .from('email_connections')
        .update({
          access_token: accessToken,
          expires_at: newExpiresAt.toISOString()
        })
        .eq('id', connection.id);
      
      console.log('✅ Access token refreshed successfully');
    }

    console.log('✅ Access token ready for Gmail API calls');
    console.log('📧 Connection email:', connection.email);

    // Se for apenas para contar, buscar apenas o total
    if (countOnly) {
      // Para obter contagem precisa, vamos buscar uma quantidade maior e contar
      const params = new URLSearchParams({
        maxResults: '500', // Buscar mais emails para contagem mais precisa
        ...(labelIds.length > 0 && { labelIds: labelIds.join(',') }),
        ...(query && { q: query })
      });

      console.log('🔍 Gmail API URL for count:', `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`);
      console.log('🔍 LabelIds being sent:', labelIds);

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
        return new Response(JSON.stringify({ error: 'Failed to fetch email count' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const gmailData = await gmailResponse.json();
      console.log('📊 Gmail API response for count:', gmailData);
      
      // Contar os emails retornados
      const actualCount = gmailData.messages ? gmailData.messages.length : 0;
      
      // Se temos nextPageToken, significa que há mais emails
      // Neste caso, vamos usar o resultSizeEstimate como fallback
      const totalCount = gmailData.nextPageToken ? (gmailData.resultSizeEstimate || actualCount) : actualCount;
      
      console.log('📈 Actual count:', actualCount, 'Total estimate:', gmailData.resultSizeEstimate, 'Final count:', totalCount);
      
      return new Response(JSON.stringify({
        success: true,
        totalCount: totalCount,
        labelIds: labelIds
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Construir URL da API Gmail - Buscar apenas emails não lidos
    const params = new URLSearchParams({
      maxResults: maxResults.toString(),
      labelIds: 'UNREAD', // Apenas emails não lidos
      ...(query && { q: query }),
      ...(pageToken && { pageToken: pageToken })
    });

    // Buscar e-mails
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
      console.error('Gmail API error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to fetch emails' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const gmailData = await gmailResponse.json();

    // Buscar detalhes de cada e-mail (apenas não lidos para o frontend também)
    const emails: Email[] = await Promise.all(
      gmailData.messages?.slice(0, maxResults).map(async (message: any) => {
        const detailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!detailResponse.ok) {
          console.error(`Failed to fetch email ${message.id}`);
          return null;
        }

        const detail = await detailResponse.json();

        // Função para decodificar headers de email
        const decodeHeader = (value: string): string => {
          if (!value) return '';
          
          // Verificar se é um header codificado (ex: =?UTF-8?B?...?=)
          const encodedMatch = value.match(/=\?([^?]+)\?([BQ])\?([^?]+)\?=/);
          if (encodedMatch) {
            const [, charset, encoding, data] = encodedMatch;
            try {
              if (encoding === 'B') {
                // Base64 encoding
                const decoded = decodeBase64WithEncoding(data, charset.toUpperCase());
                console.log(`Header decoded: ${charset} ${encoding} -> ${decoded}`);
                return decoded;
              } else if (encoding === 'Q') {
                // Quoted-printable encoding
                const decoded = decodeQuotedPrintable(data, charset.toUpperCase());
                console.log(`Header decoded: ${charset} ${encoding} -> ${decoded}`);
                return decoded;
              }
            } catch (e) {
              console.error('Error decoding header:', e);
              return value; // Retornar valor original se falhar
            }
          }
          
          return value;
        };

        // Extrair headers
        const headers = detail.payload?.headers || [];
        const from = decodeHeader(headers.find((h: any) => h.name === 'From')?.value || 'Unknown');
        const to = decodeHeader(headers.find((h: any) => h.name === 'To')?.value || '');
        const subject = decodeHeader(headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject');
        const date = headers.find((h: any) => h.name === 'Date')?.value || new Date().toISOString();

        // Determinar prioridade
        let priority: 'high' | 'normal' | 'low' = 'normal';
        const subjectLower = subject.toLowerCase();
        const fromLower = from.toLowerCase();

        if (subjectLower.includes('urgent') || subjectLower.includes('asap') ||
            fromLower.includes('admissions') || fromLower.includes('financial')) {
          priority = 'high';
        } else if (subjectLower.includes('newsletter') || subjectLower.includes('promotion')) {
          priority = 'low';
        }

        // Extrair informações dos anexos
        const attachments: EmailAttachment[] = [];
        console.log('🔍 Checking for attachments in email:', message.id);
        
        if (detail.payload?.parts) {
          console.log('📎 Email has parts, checking for attachments...');
          for (const part of detail.payload.parts) {
            console.log('📄 Part:', {
              mimeType: part.mimeType,
              filename: part.filename,
              hasAttachmentId: !!part.body?.attachmentId,
              size: part.body?.size
            });
            
            if (part.filename && part.body?.attachmentId) {
              const attachment = {
                id: part.body.attachmentId,
                filename: part.filename,
                mimeType: part.mimeType || 'application/octet-stream',
                size: part.body.size || 0,
                attachmentId: part.body.attachmentId
              };
              attachments.push(attachment);
              console.log('✅ Found attachment:', attachment);
            }
          }
        } else if (detail.payload?.body?.attachmentId) {
          // Email sem parts mas com anexo no body principal
          console.log('📎 Email has attachment in main body');
          if (detail.payload.filename) {
            const attachment = {
              id: detail.payload.body.attachmentId,
              filename: detail.payload.filename,
              mimeType: detail.payload.mimeType || 'application/octet-stream',
              size: detail.payload.body.size || 0,
              attachmentId: detail.payload.body.attachmentId
            };
            attachments.push(attachment);
            console.log('✅ Found attachment in main body:', attachment);
          }
        }
        
        console.log('📊 Total attachments found:', attachments.length);

        // Extrair HTML e texto separadamente
        const emailBody = extractEmailBody(detail.payload);
        let htmlBody: string | undefined;
        let textBody: string | undefined;

        // Função auxiliar para processar parte do email (reutilizando a lógica de extractEmailBody)
        const processPartForType = (part: any): string => {
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

        if (detail.payload?.parts) {
          for (const part of detail.payload.parts) {
            if (part.mimeType === 'text/html' && part.body?.data) {
              htmlBody = processPartForType(part);
            } else if (part.mimeType === 'text/plain' && part.body?.data) {
              textBody = processPartForType(part);
            }
          }
        } else if (detail.payload?.body?.data) {
          if (detail.payload.mimeType === 'text/html') {
            htmlBody = processPartForType(detail.payload);
          } else {
            textBody = processPartForType(detail.payload);
          }
        }

        const emailData = {
          id: message.id,
          threadId: message.threadId,
          from: from,
          to: to,
          subject: subject,
          snippet: detail.snippet || '',
          body: emailBody,
          htmlBody: htmlBody,
          date: new Date(date).toLocaleString(),
          isRead: !detail.labelIds?.includes('UNREAD'),
          hasAttachments: attachments.length > 0,
          attachments: attachments.length > 0 ? attachments : undefined,
          priority: priority,
          labels: detail.labelIds || []
        };



        return emailData;
      }) || []
    );

    // Filtrar e-mails válidos e ordenar por data
    const validEmails = emails.filter(email => email !== null).sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    console.log('✅ Emails fetched successfully:', {
      count: validEmails.length,
      user: connection.email,
      timestamp: new Date().toISOString()
    });
    
    console.log('📊 Processing emails for ngrok...');
    console.log('📊 Total emails to check:', validEmails.length);

    return new Response(JSON.stringify({
      success: true,
      emails: validEmails,
      total: validEmails.length,
      nextPageToken: gmailData.nextPageToken
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-gmail-inbox:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 