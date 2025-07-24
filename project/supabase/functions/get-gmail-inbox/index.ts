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

// Função para decodificar conteúdo base64 com encoding correto
function decodeBase64WithEncoding(base64Data: string, encoding: string = 'UTF-8'): string {
  try {
    // Substituir caracteres URL-safe
    const normalizedData = base64Data.replace(/-/g, '+').replace(/_/g, '/');
    
    // Decodificar base64
    const binaryString = atob(normalizedData);
    
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
      return atob(normalizedData);
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
        // Normalizar encodings comuns
        if (encoding === 'ISO-8859-1') encoding = 'ISO-8859-1';
        else if (encoding === 'WINDOWS-1252') encoding = 'WINDOWS-1252';
        else if (encoding === 'LATIN1') encoding = 'ISO-8859-1';
      }
    }
    
    try {
      return decodeBase64WithEncoding(part.body.data, encoding);
    } catch (e) {
      console.error('Error processing part with encoding:', encoding, e);
      // Tentar com UTF-8 como fallback
      return decodeBase64WithEncoding(part.body.data, 'UTF-8');
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

interface Email {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  body: string; // Conteúdo completo do email
  date: string;
  isRead: boolean;
  hasAttachments: boolean;
  priority: 'high' | 'normal' | 'low';
  labels: string[];
}

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

    // Construir URL da API Gmail
    const params = new URLSearchParams({
      maxResults: maxResults.toString(),
      ...(labelIds.length > 0 && { labelIds: labelIds.join(',') }),
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

    // Buscar detalhes de cada e-mail
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
                return decodeBase64WithEncoding(data, charset.toUpperCase());
              } else if (encoding === 'Q') {
                // Quoted-printable encoding
                return decodeQuotedPrintable(data, charset.toUpperCase());
              }
            } catch (e) {
              console.error('Error decoding header:', e);
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

        return {
          id: message.id,
          threadId: message.threadId,
          from: from,
          to: to,
          subject: subject,
          snippet: detail.snippet || '',
          body: extractEmailBody(detail.payload), // Adicionar o conteúdo completo
          date: new Date(date).toLocaleString(),
          isRead: !detail.labelIds?.includes('UNREAD'),
          hasAttachments: detail.payload?.parts?.some((part: any) => part.filename) || false,
          priority: priority,
          labels: detail.labelIds || []
        };
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