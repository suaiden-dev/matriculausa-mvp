import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { crypto } from 'https://deno.land/std@0.208.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para detectar automaticamente a URL do frontend
function getFrontendUrl(req: Request): string {
  console.log('🔍 Debug: Starting frontend URL detection...');
  
  // FORÇAR APENAS DESENVOLVIMENTO - IGNORAR PRODUÇÃO COMPLETAMENTE
  console.log('🔧 FORCING DEVELOPMENT ENVIRONMENT ONLY: http://localhost:5173');
  return 'http://localhost:5173';
}



// Função para criptografar dados
async function encryptData(data: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const keyBuffer = encoder.encode(key);
  
  // Deriva uma chave de 32 bytes usando PBKDF2
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
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    dataBuffer
  );
  
  // Combina IV + dados criptografados em base64
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    const state = url.searchParams.get('state');

    // Verificar se há erro
    if (error) {
      console.error('OAuth error:', error);
      const frontendUrl = getFrontendUrl(req);
      const redirectUrl = `${frontendUrl}/auth/callback?error=oauth_failed&message=${encodeURIComponent(error)}`;
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': redirectUrl },
      });
    }

    // Verificar se temos o código
    if (!code) {
      const frontendUrl = getFrontendUrl(req);
      const redirectUrl = `${frontendUrl}/auth/callback?error=no_code`;
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': redirectUrl },
      });
    }

    // Extrair user_id do state (se enviado)
    const userId = state ? state.split('_')[1] : null;

    console.log('✅ OAuth callback received:', { code: code.substring(0, 10) + '...', userId });

    // Configurações do Google OAuth
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    // Usar a URL da Edge Function para a troca de tokens
    const redirectUri = 'https://fitpynguasqqutuhzifx.supabase.co/functions/v1/google-oauth-callback';
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY') || 'default-key-change-in-production';

    if (!clientId || !clientSecret) {
      console.error('Missing Google OAuth credentials');
      const frontendUrl = getFrontendUrl(req);
      const redirectUrl = `${frontendUrl}/auth/callback?error=config_missing`;
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': redirectUrl },
      });
    }

    // Trocar código por tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      const frontendUrl = getFrontendUrl(req);
      const redirectUrl = `${frontendUrl}/auth/callback?error=token_exchange_failed`;
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': redirectUrl },
      });
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ Tokens received:', { 
      access_token: tokenData.access_token ? 'present' : 'missing',
      refresh_token: tokenData.refresh_token ? 'present' : 'missing',
      expires_in: tokenData.expires_in 
    });

    // Buscar informações do usuário
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    let userEmail = 'unknown@example.com';
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      userEmail = userInfo.email;
      console.log('✅ User info received:', { email: userEmail });
    }

    // Se não temos user_id, precisamos buscar pelo email
    let finalUserId = userId;
    if (!finalUserId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // Buscar usuário pelo email
      const { data: users, error: userError } = await supabase.auth.admin.listUsers();
      if (!userError && users) {
        const user = users.users.find(u => u.email === userEmail);
        if (user) {
          finalUserId = user.id;
          console.log('✅ Found user by email:', finalUserId);
        }
      }
    }

    if (!finalUserId) {
      console.error('No user ID found for email:', userEmail);
      const frontendUrl = getFrontendUrl(req);
      const redirectUrl = `${frontendUrl}/auth/callback?error=user_not_found`;
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': redirectUrl },
      });
    }

    // Criptografar refresh_token antes de salvar
    const encryptedRefreshToken = await encryptData(tokenData.refresh_token, encryptionKey);

    // Salvar tokens no banco de dados
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (tokenData.expires_in || 3600));

    console.log('🔍 Creating new email connection for user:', finalUserId);
    
    // Verificar se já existe uma conexão com este email específico
    const { data: existingConnection, error: checkError } = await supabase
      .from('email_connections')
      .select('id')
      .eq('user_id', finalUserId)
      .eq('provider', 'google')
      .eq('email', userEmail)
      .single();

    let connectionData;
    let insertError;

    if (existingConnection) {
      // Atualizar conexão existente para este email específico
      console.log('🔍 Updating existing connection for email:', userEmail);
      const { data: updateData, error: updateError } = await supabase
        .from('email_connections')
        .update({
          access_token: tokenData.access_token,
          refresh_token: encryptedRefreshToken,
          expires_at: expiresAt.toISOString(),
          scopes: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send']
        })
        .eq('id', existingConnection.id)
        .select()
        .single();
      
      connectionData = updateData;
      insertError = updateError;
    } else {
      // Criar nova conexão para este email
      console.log('🔍 Creating new connection for email:', userEmail);
      const { data: insertData, error: insertErr } = await supabase
        .from('email_connections')
        .insert({
        user_id: finalUserId,
        provider: 'google',
        access_token: tokenData.access_token,
        refresh_token: encryptedRefreshToken,
        expires_at: expiresAt.toISOString(),
        email: userEmail,
        scopes: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send']
      })
      .select()
      .single();

      connectionData = insertData;
      insertError = insertErr;
    }

    console.log('🔍 Operation result:', { 
      success: !insertError, 
      error: insertError ? insertError.message : null,
      data: connectionData ? 'present' : 'null'
    });

    if (insertError) {
      console.error('Error saving email connection:', insertError);
      const frontendUrl = getFrontendUrl(req);
      const redirectUrl = `${frontendUrl}/school/dashboard/inbox?error=save_failed`;
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': redirectUrl },
      });
    }

    console.log('✅ Email connection saved successfully:', { 
      id: connectionData.id, 
      user_id: connectionData.user_id,
      email: connectionData.email 
    });

    // Redirecionar de volta para o Inbox com sucesso
    // FORÇAR APENAS DESENVOLVIMENTO - SEMPRE LOCALHOST
    const frontendUrl = getFrontendUrl(req);
    const redirectUrl = `${frontendUrl}/school/dashboard/inbox?status=success&email=${encodeURIComponent(userEmail)}`;
    
    console.log('🔄 Redirecting to:', redirectUrl);
    console.log('🔄 Frontend URL:', frontendUrl);
    console.log('🔄 User email:', userEmail);
    console.log('🔄 Request headers:', Object.fromEntries(req.headers.entries()));
    console.log('🔄 Request URL:', req.url);
    
    return new Response(null, {
      status: 302,
      headers: { 
        ...corsHeaders, 
        'Location': redirectUrl,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    });

  } catch (error) {
    console.error('Unexpected error in google-oauth-callback:', error);
    const frontendUrl = getFrontendUrl(req);
    const redirectUrl = `${frontendUrl}/school/dashboard/inbox?error=unexpected_error`;
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, 'Location': redirectUrl },
    });
  }
}); 