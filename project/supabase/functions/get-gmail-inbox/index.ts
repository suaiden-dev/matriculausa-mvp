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

// Função para extrair o conteúdo completo do email
function extractEmailBody(payload: any): string {
  if (!payload) return '';

  // Se tem parts, processar cada parte
  if (payload.parts && payload.parts.length > 0) {
    for (const part of payload.parts) {
      // Priorizar texto simples
      if (part.mimeType === 'text/plain' && part.body?.data) {
        try {
          return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        } catch (e) {
          console.error('Error decoding text/plain:', e);
        }
      }
    }
    
    // Se não encontrou texto simples, procurar HTML
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        try {
          const htmlContent = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          // Converter HTML para texto simples (remover tags)
          return htmlContent.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
        } catch (e) {
          console.error('Error decoding text/html:', e);
        }
      }
    }
  }

  // Se não tem parts, verificar se o payload tem dados diretamente
  if (payload.body?.data) {
    try {
      const content = atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      if (payload.mimeType === 'text/html') {
        // Converter HTML para texto simples
        return content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
      }
      return content;
    } catch (e) {
      console.error('Error decoding payload body:', e);
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

    // Buscar conexão Gmail do usuário
    const { data: connection, error: connectionError } = await supabase
      .from('email_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .single();

    if (connectionError || !connection) {
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
      const params = new URLSearchParams({
        maxResults: '1', // Mínimo para obter o total
        ...(labelIds.length > 0 && { labelIds: labelIds.join(',') }),
        ...(query && { q: query })
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
        console.error('Gmail API error:', errorText);
        return new Response(JSON.stringify({ error: 'Failed to fetch email count' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const gmailData = await gmailResponse.json();
      
      return new Response(JSON.stringify({
        success: true,
        totalCount: gmailData.resultSizeEstimate || 0,
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

        // Extrair headers
        const headers = detail.payload?.headers || [];
        const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
        const to = headers.find((h: any) => h.name === 'To')?.value || '';
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
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