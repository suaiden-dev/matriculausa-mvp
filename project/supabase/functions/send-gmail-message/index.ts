import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendEmailRequest {
  to: string;
  subject: string;
  htmlBody?: string;
  textBody?: string;
  threadId?: string;
  attachments?: Array<{
    filename: string;
    mimeType: string;
    data: string; // base64 encoded
  }>;
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
    
    // Parse error response
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: 'unknown' };
    }
    
    if (errorData.error === 'invalid_grant') {
      throw new Error('Gmail access expired. Please reconnect your Gmail account in the inbox settings.');
    } else {
      throw new Error(`Failed to refresh access token: ${errorData.error_description || errorData.error}`);
    }
  }

  const data = await response.json();
  return data.access_token;
}

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

// Função para corrigir encoding de caracteres
function fixEncoding(text: string): string {
  if (!text) return text;
  
  try {
    // Verificar se parece estar double-encoded
    if (text.includes('ÃƒÂ£') || text.includes('Ã°ÂŸÂŸÂ¢')) {
      console.log('🔧 Detected encoding issues, attempting to fix:', text);
      
      // Tentar decodificar UTF-8
      const buffer = new Uint8Array(text.split('').map(c => c.charCodeAt(0)));
      const decoder = new TextDecoder('utf-8');
      const decoded = decoder.decode(buffer);
      
      console.log('✅ Fixed encoding:', decoded);
      return decoded;
    }
    
    return text;
  } catch (error) {
    console.log('⚠️ Could not fix encoding for text:', text);
    return text;
  }
}

// Função para criar boundary único para MIME
function generateBoundary(): string {
  return `----=_NextPart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Função para criar email MIME com anexos
function createMimeMessage(request: SendEmailRequest): string {
  const boundary = generateBoundary();
  const messageId = `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@gmail.com>`;
  
  let mimeMessage = [
    `MIME-Version: 1.0`,
    `Message-ID: ${messageId}`,
    `Date: ${new Date().toUTCString()}`,
    `To: ${request.to}`,
    `Subject: ${request.subject}`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: multipart/alternative; boundary="${boundary}_alt"`,
    ``,
    `--${boundary}_alt`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    request.textBody || request.htmlBody?.replace(/<[^>]*>/g, '') || '',
    ``,
    `--${boundary}_alt`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    request.htmlBody || request.textBody || '',
    ``,
    `--${boundary}_alt--`
  ].join('\r\n');

  // Adicionar anexos se existirem
  if (request.attachments && request.attachments.length > 0) {
    for (const attachment of request.attachments) {
      mimeMessage += [
        ``,
        `--${boundary}`,
        `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`,
        `Content-Disposition: attachment; filename="${attachment.filename}"`,
        `Content-Transfer-Encoding: base64`,
        ``,
        attachment.data
      ].join('\r\n');
    }
  }

  mimeMessage += `\r\n--${boundary}--\r\n`;
  
  return mimeMessage;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('📧 send-gmail-message: Raw request body:', requestBody);
    
    const { to, subject, htmlBody, textBody, threadId, attachments }: SendEmailRequest = requestBody;

    // Aplicar correção de encoding nos dados do email
    const fixedSubject = fixEncoding(subject);
    const fixedHtmlBody = htmlBody ? fixEncoding(htmlBody) : undefined;
    const fixedTextBody = textBody ? fixEncoding(textBody) : undefined;

    console.log('📧 send-gmail-message: Request received:', {
      to,
      subject: fixedSubject,
      hasHtmlBody: !!fixedHtmlBody,
      hasTextBody: !!fixedTextBody,
      htmlBodyLength: fixedHtmlBody?.length || 0,
      textBodyLength: fixedTextBody?.length || 0,
      threadId,
      attachmentsCount: attachments?.length || 0
    });

    if (!to || !fixedSubject || (!fixedHtmlBody && !fixedTextBody)) {
      throw new Error('Missing required fields: to, subject, and either htmlBody or textBody');
    }

    // Get current user session
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get user from JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('User not authenticated');
    }

    // Get user's Gmail connection
    const { data: connections, error: connectionError } = await supabase
      .from('email_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .limit(1);

    if (connectionError || !connections || connections.length === 0) {
      throw new Error('No Gmail connection found. Please connect your Gmail account in the inbox settings.');
    }

    const connection = connections[0];
    let accessToken = connection.access_token;

    // Check if token is expired and refresh if needed
    if (new Date(connection.expires_at) <= new Date()) {
      console.log('Token expired, refreshing...');
      accessToken = await refreshAccessToken(connection.refresh_token);
      
      // Update the connection with new token
      await supabase
        .from('email_connections')
        .update({
          access_token: accessToken,
          expires_at: new Date(Date.now() + 3600 * 1000).toISOString()
        })
        .eq('id', connection.id);
    }

    // Create MIME message with fixed encoding
    const mimeMessage = createMimeMessage({
      to,
      subject: fixedSubject,
      htmlBody: fixedHtmlBody,
      textBody: fixedTextBody,
      attachments
    });

    // Encode the email content (Base64URL) - handle Unicode characters
    const encodedEmail = btoa(unescape(encodeURIComponent(mimeMessage)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Prepare the Gmail API request body
    const gmailRequestBody: any = {
      raw: encodedEmail
    };

    // If replying to a thread, include the thread ID
    if (threadId) {
      gmailRequestBody.threadId = threadId;
    }

    // Send email via Gmail API
    const gmailResponse = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(gmailRequestBody)
      }
    );

    if (!gmailResponse.ok) {
      const error = await gmailResponse.text();
      console.error('Gmail send error:', error);
      throw new Error(`Gmail send error: ${gmailResponse.status}`);
    }

    const result = await gmailResponse.json();

    console.log('Email sent successfully:', {
      messageId: result.id,
      threadId: result.threadId,
      to: to,
      subject: fixedSubject,
      attachmentsCount: attachments?.length || 0,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.id,
        threadId: result.threadId,
        sentAt: new Date().toISOString(),
        to: to,
        subject: fixedSubject
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
}); 