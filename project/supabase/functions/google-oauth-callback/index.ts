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
  
  // PRIORIDADE 1: Variáveis de ambiente (mais confiável)
  const isProduction = Deno.env.get('IS_PRODUCTION');
  const isDevelopment = Deno.env.get('IS_DEVELOPMENT');
  
  if (isProduction === 'true') {
    console.log('🔧 Using production URL from IS_PRODUCTION environment variable');
    return 'https://matriculausa.com';
  }
  
  if (isDevelopment === 'true') {
    console.log('🔧 Using development URL from IS_DEVELOPMENT environment variable');
    return 'http://localhost:5173';
  }
  
  // PRIORIDADE 2: Detectar baseado no referer (se não for do Google)
  const referer = req.headers.get('referer');
  console.log('🔍 Debug: Referer header:', referer);
  
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const hostname = refererUrl.hostname;
      console.log('🔍 Debug: Parsed hostname from referer:', hostname);
      
      // IGNORAR Google OAuth domains
      if (hostname.includes('accounts.google.com') || 
          hostname.includes('google.com') || 
          hostname.includes('googleapis.com')) {
        console.log('🔍 Debug: Ignoring Google OAuth domain:', hostname);
      } else {
        // Se é localhost, é desenvolvimento
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          const devUrl = `http://${hostname}:${refererUrl.port || '5173'}`;
          console.log('🔧 Detected development environment from referer:', devUrl);
          return devUrl;
        }
        
        // Se é matriculausa.com, é produção
        if (hostname.includes('matriculausa.com')) {
          const prodUrl = `${refererUrl.protocol}//${hostname}`;
          console.log('🔧 Detected production environment from referer:', prodUrl);
          return prodUrl;
        }
        
        console.log('🔍 Debug: Hostname did not match any known pattern:', hostname);
      }
    } catch (error) {
      console.error('Error parsing referer:', error);
    }
  } else {
    console.log('🔍 Debug: No referer header found');
  }

  // PRIORIDADE 3: Detectar baseado no Origin header
  const origin = req.headers.get('origin');
  console.log('🔍 Debug: Origin header:', origin);
  
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const hostname = originUrl.hostname;
      console.log('🔍 Debug: Parsed hostname from origin:', hostname);
      
      // Se é localhost, é desenvolvimento
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        const devUrl = `http://${hostname}:${originUrl.port || '5173'}`;
        console.log('🔧 Detected development environment from origin:', devUrl);
        return devUrl;
      }
      
      // Se é matriculausa.com, é produção
      if (hostname.includes('matriculausa.com')) {
        const prodUrl = `${originUrl.protocol}//${hostname}`;
        console.log('🔧 Detected production environment from origin:', prodUrl);
        return prodUrl;
      }
    } catch (error) {
      console.error('Error parsing origin:', error);
    }
  }

  // PRIORIDADE 4: Detectar baseado no Host header
  const host = req.headers.get('host');
  console.log('🔍 Debug: Host header:', host);
  
  if (host) {
    // Se o host contém matriculausa.com, é produção
    if (host.includes('matriculausa.com')) {
      console.log('🔧 Detected production environment from host header');
      return 'https://matriculausa.com';
    }
    
    // Se o host contém localhost, é desenvolvimento
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      console.log('🔧 Detected development environment from host header');
      return 'http://localhost:5173';
    }
  }

  // PRIORIDADE 5: Detectar baseado no Supabase URL
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  console.log('🔍 Debug: Supabase URL:', supabaseUrl);
  
  if (supabaseUrl) {
    // Se o Supabase URL contém 'supabase.co', provavelmente é produção
    if (supabaseUrl.includes('supabase.co')) {
      console.log('🔧 Detected production environment from Supabase URL');
      return 'https://matriculausa.com';
    }
  }

  // PRIORIDADE 6: Detectar baseado no domínio da edge function
  const currentUrl = new URL(req.url);
  const edgeFunctionHost = currentUrl.hostname;
  console.log('🔍 Debug: Edge function host:', edgeFunctionHost);
  
  if (edgeFunctionHost.includes('supabase.co')) {
    console.log('🔧 Detected production environment from edge function host');
    return 'https://matriculausa.com';
  }

  // FALLBACK: Usar desenvolvimento como padrão (mais seguro)
  console.log('🔧 Using default development URL: http://localhost:5173');
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
    // Usar a URL base do frontend em vez da URL da Edge Function
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